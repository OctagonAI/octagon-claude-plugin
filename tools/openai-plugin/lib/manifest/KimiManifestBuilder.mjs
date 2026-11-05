// @ts-check
import { SKILLS_DIR } from "./ManifestBuilder.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */
/** @typedef {import("./KimiTranslations.mjs").KimiTranslations} KimiTranslations */

/** Root manifest; the hosted validator accepts no other location. */
export const KIMI_MANIFEST_PATH = "kimi.plugin.json";
export const KIMI_SYSTEM_PROMPT_PATH = "SYSTEM.md";
export const KIMI_README_PATH = "README.md";
export const KIMI_LICENSE_PATH = "LICENSE";
export const KIMI_ICON_PATH = "assets/icon.png";
/** Directory of per-locale display text; the validator requires exactly this value for `interface.locales`. */
export const KIMI_LOCALES_DIR = "locales";
/** Repository directory (POSIX, relative to the root) that holds the committed Kimi packages. */
export const KIMI_PLUGINS_DIR = "kimi/plugins";
/** Repository path (POSIX) of the self-serve custom marketplace catalog. */
export const KIMI_CATALOG_PATH = "kimi/marketplace.json";
/** The catalog schema version Kimi Code documents for custom marketplaces. */
export const KIMI_CATALOG_VERSION = "2";
/** GitHub topics set on each mirror repository. */
export const KIMI_MIRROR_TOPICS = Object.freeze(["kimi-plugin", "kimi-code", "mcp"]);

/** The hosted validator's limits on `interface.shortDescription` and `tryPrompts`. */
export const KIMI_SHORT_DESCRIPTION_MAX = 20;
export const KIMI_TRY_PROMPTS_MAX = 3;
/** Locales the hosted validator accepts as `defaultLocale`. */
export const KIMI_LOCALES = Object.freeze(["en-US", "zh-CN"]);
export const KIMI_DEFAULT_LOCALE = "en-US";
/** Per-field cap on system-prompt contributions (UTF-8 bytes), from the Kimi Code docs. */
export const KIMI_SYSTEM_PROMPT_MAX_BYTES = 32 * 1024;
/** Report generation can run for minutes; Kimi's per-server tool timeout is stated so the default never cuts one off. */
export const KIMI_TOOL_TIMEOUT_MS = 600_000;
/** Product hosts and server operating systems the plugin is available on; it runs nothing locally, so all of them. */
export const KIMI_CLIENTS = Object.freeze(["desktop", "cli"]);
export const KIMI_PLATFORMS = Object.freeze(["macos", "windows", "linux"]);

/** Manifest fields Kimi Code documents and this builder may write. */
export const KIMI_MANIFEST_FIELDS = Object.freeze([
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "license",
  "keywords",
  "skills",
  "sessionStart",
  "skillInstructions",
  "systemPromptPath",
  "mcpServers",
  "interface",
]);
/** Server fields this builder may write: one remote HTTP server with native OAuth, and nothing local. */
export const KIMI_SERVER_FIELDS = Object.freeze(["url", "auth", "enabledTools", "toolTimeoutMs"]);
/** `interface` fields this builder may write; the hosted validator requires all but `websiteURL`. */
export const KIMI_INTERFACE_FIELDS = Object.freeze([
  "displayName",
  "shortDescription",
  "longDescription",
  "developerName",
  "websiteURL",
  "tryPrompts",
  "defaultLocale",
  "locales",
  "mcpOverrides",
  "skillOverrides",
]);

/**
 * Turns a {@link PluginConfig}, the built skills, and the default-locale
 * translations into a `kimi.plugin.json`. Pure: no I/O, stable key order.
 *
 * The one server is declared with `url` and `auth: "oauth"`, the native OAuth
 * flag in Kimi's MCP config schema, which plugin manifests reuse. The host
 * discovers the authorization server from the MCP server's metadata
 * (protected-resource metadata, dynamic client registration, PKCE), so no
 * headers, tokens, or environment variables are declared.
 */
export class KimiManifestBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /** @returns {string} The MCP server key users see in `/plugins` and `/mcp`. */
  serverName() {
    return this.#config.kimi().serverName ?? this.#config.data.mcp.serverName;
  }

  /** @returns {string} The endpoint the plugin connects to; the profile's URL unless the Kimi block narrows it. */
  mcpUrl() {
    return this.#config.kimi().mcpUrl ?? this.#config.data.mcp.url;
  }

  /** @returns {string[]} The tools the plugin exposes after its allow-list. */
  exposedTools() {
    const { enabledTools } = this.#config.kimi();
    return [...(enabledTools ?? this.#config.data.mcp.tools)];
  }

  /** @returns {string} The plugin's display name, from the listing interface. */
  displayName() {
    const ui = /** @type {Record<string, unknown>} */ (this.#config.data.interface);
    return typeof ui.displayName === "string" ? ui.displayName : this.#config.data.name;
  }

  /** @returns {string[]} At most three reviewer prompts, taken from the smoke tests. */
  tryPrompts() {
    return this.#config.listing().smokeTests.slice(0, KIMI_TRY_PROMPTS_MAX).map(test => test.prompt);
  }

  /** @returns {string[]} Locales other than the default, in config order; each ships as `locales/<locale>.json`. */
  translatedLocales() {
    return Object.keys(this.#config.kimi().translations).filter(locale => locale !== KIMI_DEFAULT_LOCALE);
  }

  /**
   * @param {string} locale
   * @returns {string} Package path of that locale's display file.
   */
  static localePath(locale) {
    return `${KIMI_LOCALES_DIR}/${locale}.json`;
  }

  /**
   * The display text of the default locale, in the shape the manifest's
   * `interface` and every `locales/<locale>.json` share.
   *
   * @param {{ skills: readonly SkillDocument[], translations: KimiTranslations }} context
   *   `translations` is the default-locale file: it names every skill, and may
   *   restate a skill's description.
   * @returns {Record<string, unknown>}
   */
  interfaceText({ skills, translations }) {
    const config = this.#config.data;
    const kimi = this.#config.kimi();
    const ui = /** @type {Record<string, unknown>} */ (config.interface);
    const key = this.serverName();
    return {
      displayName: this.displayName(),
      shortDescription: kimi.shortDescription,
      longDescription: typeof ui.longDescription === "string" ? ui.longDescription : config.description,
      developerName: typeof ui.developerName === "string" ? ui.developerName : config.author.name,
      websiteURL: config.homepage,
      tryPrompts: this.tryPrompts(),
      mcpOverrides: {
        [key]: {
          displayName: translations.server(key)?.displayName ?? `${this.displayName()} research server`,
          description: translations.server(key)?.description ?? config.description,
          iconUrl: kimi.iconUrl,
        },
      },
      skillOverrides: Object.fromEntries(
        [...skills]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(skill => {
            const text = translations.skill(skill.name);
            return [skill.name, { displayName: text.displayName, description: text.description ?? skill.description }];
          }),
      ),
    };
  }

  /**
   * @param {{ skills: readonly SkillDocument[], translations: KimiTranslations }} context
   * @returns {Record<string, unknown>}
   */
  manifest({ skills, translations }) {
    const config = this.#config.data;
    const kimi = this.#config.kimi();
    const server = compact({
      url: this.mcpUrl(),
      auth: "oauth",
      enabledTools: kimi.enabledTools ? [...kimi.enabledTools] : undefined,
      toolTimeoutMs: KIMI_TOOL_TIMEOUT_MS,
    });
    return compact({
      name: config.name,
      version: config.version,
      description: config.description,
      author: compact({ name: config.author.name, email: config.author.email }),
      homepage: config.homepage,
      license: config.license,
      keywords: config.keywords,
      skills: [`./${SKILLS_DIR}/`],
      sessionStart: config.onboardingSkill ? { skill: config.onboardingSkill } : undefined,
      skillInstructions: `Cite the source of every figure. ${this.#config.listing().scopeNote}`,
      systemPromptPath: `./${KIMI_SYSTEM_PROMPT_PATH}`,
      mcpServers: { [this.serverName()]: server },
      interface: {
        ...this.interfaceText({ skills, translations }),
        defaultLocale: KIMI_DEFAULT_LOCALE,
        locales: `./${KIMI_LOCALES_DIR}/`,
      },
    });
  }

  /**
   * One `locales/<locale>.json`: the full interface text in another language.
   * Every key the default locale has is present, so a host can switch locale
   * without falling back field by field.
   *
   * @param {{ skills: readonly SkillDocument[], translations: KimiTranslations }} context
   *   `translations` is that locale's file, which carries interface text,
   *   the server's text, and every skill's name and description.
   * @returns {Record<string, unknown>}
   */
  localeText({ skills, translations }) {
    const key = this.serverName();
    const ui = translations.interface();
    const server = translations.server(key);
    return {
      displayName: ui.displayName,
      shortDescription: ui.shortDescription,
      longDescription: ui.longDescription,
      developerName: ui.developerName,
      tryPrompts: [...ui.tryPrompts],
      mcpOverrides: { [key]: { displayName: server?.displayName, description: server?.description } },
      skillOverrides: Object.fromEntries(
        [...skills]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(skill => {
            const text = translations.skill(skill.name);
            return [skill.name, { displayName: text.displayName, description: text.description }];
          }),
      ),
    };
  }

  /** @returns {string} File name of the release archive for this version. */
  archiveName() {
    const { name, version } = this.#config.data;
    return `${name}-kimi-${version}.zip`;
  }

  /** @returns {string} Where the release workflow publishes this version's archive. */
  releaseAssetUrl() {
    const { repository } = this.#config.kimi();
    return `${repository}/releases/download/v${this.#config.data.version}/${this.archiveName()}`;
  }

  /**
   * The entry for `kimi/marketplace.json` (the self-serve custom marketplace)
   * and the text handed to Moonshot for the curated catalog: the same fields
   * the live catalog carries, minus the ones Moonshot computes when it
   * re-hosts the archive (`sha256sum`, `filename`, `distribution`, `billing`).
   *
   * @returns {Record<string, unknown>}
   */
  catalogEntry() {
    const config = this.#config.data;
    const kimi = this.#config.kimi();
    return compact({
      id: config.name,
      displayName: this.displayName(),
      version: config.version,
      shortDescription: kimi.shortDescription,
      description: config.description,
      cliDescription: kimi.cliDescription,
      homepage: config.homepage,
      keywords: config.keywords,
      iconUrl: kimi.iconUrl,
      source: this.releaseAssetUrl(),
      clients: [...KIMI_CLIENTS],
      platforms: [...KIMI_PLATFORMS],
    });
  }

  /**
   * The GitHub repository settings of the mirror: About description, homepage, topics.
   *
   * @returns {{ repository: string, description: string, homepage: string, topics: string[] }}
   */
  aboutSettings() {
    const { repository, repoDescription } = this.#config.kimi();
    return {
      repository,
      description: repoDescription,
      homepage: this.#config.data.homepage ?? "",
      topics: [...KIMI_MIRROR_TOPICS],
    };
  }
}

/**
 * @param {Record<string, unknown>} object
 * @returns {Record<string, unknown>}
 */
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
