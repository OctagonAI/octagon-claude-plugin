// @ts-check
import { rm } from "node:fs/promises";
import path from "node:path";
import { Checker } from "../config/validate.mjs";
import { ConfigError } from "../errors.mjs";
import {
  KIMI_DEFAULT_LOCALE,
  KIMI_ICON_PATH,
  KIMI_LICENSE_PATH,
  KIMI_LOCALES,
  KIMI_MANIFEST_PATH,
  KIMI_PLUGINS_DIR,
  KIMI_README_PATH,
  KIMI_SYSTEM_PROMPT_PATH,
  KimiManifestBuilder,
} from "../manifest/KimiManifestBuilder.mjs";
import { KimiReadmeBuilder } from "../manifest/KimiReadmeBuilder.mjs";
import { KimiSystemPromptBuilder } from "../manifest/KimiSystemPromptBuilder.mjs";
import { KimiTranslations } from "../manifest/KimiTranslations.mjs";
import { Archiver } from "../output/Archiver.mjs";
import { createKimiRules } from "../validation/rules/kimi/index.mjs";
import { OWNED_DOMAINS } from "./GrokTarget.mjs";
import { MIRROR_OWNER } from "./GeminiTarget.mjs";
import { Target } from "./Target.mjs";

/**
 * The Kimi plugin: a directory with the root manifest (one remote HTTP server
 * with native OAuth), a system-prompt file, per-locale display text, the
 * skills, the icon, a README, and the license. The directory is committed
 * under `kimi/plugins/<name>/` and mirrored to its own public repository, and
 * the same bytes are zipped into the release asset the hosted validator and
 * Moonshot's catalog consume, so this target both syncs and archives.
 */
export class KimiTarget extends Target {
  /** @type {string} */ #licenseFile;
  /** @type {Archiver} */ #archiver;

  /**
   * @param {{ licenseFile: string, archiver?: Archiver }} options
   *   `licenseFile` is the absolute path of the repository's LICENSE.
   */
  constructor({ licenseFile, archiver = new Archiver() }) {
    super();
    this.#licenseFile = licenseFile;
    this.#archiver = archiver;
  }

  get id() {
    return /** @type {const} */ ("kimi");
  }

  get manifestPath() {
    return KIMI_MANIFEST_PATH;
  }

  get repoDir() {
    return KIMI_PLUGINS_DIR;
  }

  /**
   * The `kimi` and `listing` blocks must exist; the short description must
   * fit the hosted validator's limit; the endpoint and icon must be on hosts
   * Octagon owns; the mirror must live under the Octagon organization; the
   * default locale must have a translation file; and the icon must be
   * declared, since the catalog shows it.
   *
   * @param {import("../config/PluginConfig.mjs").PluginConfig} config
   */
  checkConfig(config) {
    const kimi = config.kimi();
    config.listing();
    const check = new Checker();
    KimiTranslations.checkShortDescription(kimi.shortDescription, "kimi.shortDescription", check);
    const problems = [...check.problems];

    const manifest = new KimiManifestBuilder(config);
    for (const [field, url] of [
      ["kimi.mcpUrl", manifest.mcpUrl()],
      ["kimi.iconUrl", kimi.iconUrl],
    ]) {
      const host = new URL(url).host.toLowerCase();
      if (!OWNED_DOMAINS.includes(host)) problems.push(`${field}: "${host}" is not an Octagon-owned host (${OWNED_DOMAINS.join(", ")})`);
    }
    if (!kimi.repository.startsWith(`https://github.com/${MIRROR_OWNER}/`)) {
      problems.push(`kimi.repository must be under https://github.com/${MIRROR_OWNER}/`);
    }
    if (kimi.translations[KIMI_DEFAULT_LOCALE] === undefined) {
      problems.push(`kimi.translations must include the default locale ${KIMI_DEFAULT_LOCALE}, which names the skills`);
    }
    for (const locale of Object.keys(kimi.translations)) {
      if (!KIMI_LOCALES.includes(locale)) problems.push(`kimi.translations: "${locale}" is not a locale Kimi accepts (${KIMI_LOCALES.join(", ")})`);
    }
    if (manifest.translatedLocales().length === 0) {
      problems.push(`kimi.translations must include at least one locale besides ${KIMI_DEFAULT_LOCALE}; the hosted validator requires the translation`);
    }
    if (typeof config.data.interface.composerIcon !== "string") {
      problems.push("interface.composerIcon is required; the Kimi package ships it as assets/icon.png");
    }
    if (problems.length > 0) throw new ConfigError(`plugin "${config.data.name}"`, problems);
  }

  /** @param {import("../config/PluginConfig.mjs").PluginConfig} config */
  allowList(config) {
    return config.data.kimi?.enabledTools;
  }

  /** @param {import("../config/PluginConfig.mjs").PluginConfig} config */
  archiveName(config) {
    return new KimiManifestBuilder(config).archiveName();
  }

  /**
   * Loads every declared translation file (profile-relative), checks that
   * each covers exactly the built skills, then writes the manifest, locale
   * files, system prompt, README, license, and icon.
   *
   * @param {import("./Target.mjs").EmitContext} context
   */
  async emit({ writer, config, skills, assetsRoot }) {
    const manifest = new KimiManifestBuilder(config);
    const translations = await this.loadTranslations(config, assetsRoot);
    const shipped = { skillDirs: skills.map(skill => skill.name), serverKey: manifest.serverName() };
    for (const locale of translations.values()) locale.assertCovers(shipped);

    const defaultLocale = /** @type {KimiTranslations} */ (translations.get(KIMI_DEFAULT_LOCALE));
    await writer.writeJson(KIMI_MANIFEST_PATH, manifest.manifest({ skills, translations: defaultLocale }));
    for (const locale of manifest.translatedLocales()) {
      const text = /** @type {KimiTranslations} */ (translations.get(locale));
      await writer.writeJson(KimiManifestBuilder.localePath(locale), manifest.localeText({ skills, translations: text }));
    }
    await writer.writeFile(KIMI_SYSTEM_PROMPT_PATH, new KimiSystemPromptBuilder(config).systemPrompt());
    await writer.writeFile(KIMI_README_PATH, new KimiReadmeBuilder(config).readme({ skills }));
    await writer.copyFile(this.#licenseFile, KIMI_LICENSE_PATH);
    const icon = /** @type {string} */ (config.data.interface.composerIcon);
    await writer.copyFile(path.join(assetsRoot, icon.slice(2)), KIMI_ICON_PATH);
  }

  /**
   * @param {import("../config/PluginConfig.mjs").PluginConfig} config
   * @param {string} assetsRoot The profile directory translation paths are relative to.
   * @returns {Promise<Map<string, KimiTranslations>>} Keyed by locale.
   */
  async loadTranslations(config, assetsRoot) {
    const entries = await Promise.all(
      Object.entries(config.kimi().translations).map(async ([locale, file]) => {
        const absolute = path.resolve(assetsRoot, file);
        if (path.relative(assetsRoot, absolute).startsWith("..")) {
          throw new ConfigError(`plugin "${config.data.name}"`, [`kimi.translations.${locale} must stay inside the profile directory`]);
        }
        return /** @type {[string, KimiTranslations]} */ ([locale, await KimiTranslations.load(absolute, { locale, isDefault: locale === KIMI_DEFAULT_LOCALE })]);
      }),
    );
    return new Map(entries);
  }

  /** @param {import("./Target.mjs").RuleOptions} options */
  rules({ mcpUrl, pluginName, includeTools, tools, config }) {
    const manifest = config ? new KimiManifestBuilder(config) : undefined;
    return createKimiRules({
      licenseFile: this.#licenseFile,
      expectedName: pluginName,
      mcpUrl: manifest?.mcpUrl() ?? mcpUrl,
      enabledTools: includeTools,
      knownTools: tools,
      tools: includeTools ?? tools ?? [],
      locales: manifest?.translatedLocales() ?? [],
    });
  }

  /**
   * Zips the validated package into the release asset and writes its SHA-256
   * beside it; removes a stale archive when validation failed, so nothing
   * uploads an old build by mistake.
   *
   * @param {import("./Target.mjs").FinalizeContext} context
   */
  async finalize({ writer, files, pkg, validator, validation }) {
    const { name, version } = /** @type {{ name: string, version: string }} */ (pkg.manifestObject() ?? {});
    const zipName = `${name}-kimi-${version}.zip`;
    const zipPath = writer.artifactPath(zipName);
    if (!validation.ok) {
      await Promise.all([rm(zipPath, { force: true }), rm(`${zipPath}.sha256`, { force: true })]);
      return { archive: null, validation };
    }
    const archive = await this.#archiver.create(writer.stagingDir, files, zipPath);
    await writer.writeArtifactText(`${zipName}.sha256`, `${archive.sha256}  ${zipName}\n`);
    return { archive, validation: validation.merge(await validator.run({ pkg, archive }, "archive")) };
  }
}
