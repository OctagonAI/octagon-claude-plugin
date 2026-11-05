// @ts-check
import { Checker, readJsonFile } from "../config/validate.mjs";
import { ConfigError } from "../errors.mjs";
import { deepFreeze } from "../util/object.mjs";
import { KIMI_SHORT_DESCRIPTION_MAX } from "./KimiManifestBuilder.mjs";

/**
 * @typedef {{ displayName: string, description?: string }} SkillText
 * @typedef {{ displayName: string, description: string }} ServerText
 * @typedef {{ displayName: string, shortDescription: string, longDescription: string, developerName: string, tryPrompts: string[] }} InterfaceText
 * @typedef {{ interface?: InterfaceText, mcpServers?: Record<string, ServerText>, skills: Record<string, SkillText> }} TranslationData
 */

/** Punctuation the hosted validator rejects at the end of a short description. */
const TRAILING_PUNCTUATION = /[.!?。！？,，;；:：]$/u;

/**
 * One locale's display text for a Kimi plugin, loaded from the profile's
 * `kimi/<locale>.json`.
 *
 * Two roles share the file shape. The default locale's file only has to name
 * every skill (`skills.<dir>.displayName`), since the interface text and the
 * skill descriptions come from the config and the skills themselves. Every
 * other locale is a complete translation: interface text, the server's text,
 * and both strings for every skill. `check` enforces the role; `assertCovers`
 * enforces that no built skill is left untranslated.
 */
export class KimiTranslations {
  /** @type {string} */ locale;
  /** @type {boolean} */ isDefault;
  /** @type {Readonly<TranslationData>} */ data;

  /**
   * @param {{ locale: string, isDefault: boolean, data: TranslationData }} init
   */
  constructor({ locale, isDefault, data }) {
    this.locale = locale;
    this.isDefault = isDefault;
    this.data = deepFreeze(structuredClone(data));
    Object.freeze(this);
  }

  /**
   * @param {string} file
   * @param {{ locale: string, isDefault: boolean }} role
   * @returns {Promise<KimiTranslations>}
   */
  static async load(file, role) {
    const raw = await readJsonFile(file);
    KimiTranslations.check(raw, role, file);
    return new KimiTranslations({ ...role, data: /** @type {TranslationData} */ (raw) });
  }

  /**
   * @param {unknown} raw
   * @param {{ locale: string, isDefault: boolean }} role
   * @param {string} source
   */
  static check(raw, { locale, isDefault }, source) {
    const check = new Checker();
    if (!check.object(raw, "translations")) return check.throwIfAny(source);

    if (isDefault) {
      for (const key of ["interface", "mcpServers"]) {
        if (raw[key] !== undefined) check.fail(`${key} must not be set in the default locale (${locale}); it comes from plugin.config.json`);
      }
    } else {
      if (check.object(raw.interface, "interface")) {
        for (const key of ["displayName", "shortDescription", "longDescription", "developerName"]) {
          check.string(raw.interface[key], `interface.${key}`);
        }
        KimiTranslations.checkShortDescription(raw.interface.shortDescription, "interface.shortDescription", check);
        if (check.stringArray(raw.interface.tryPrompts, "interface.tryPrompts") && raw.interface.tryPrompts.length === 0) {
          check.fail("interface.tryPrompts must list at least one prompt");
        }
      }
      if (check.object(raw.mcpServers, "mcpServers")) {
        if (Object.keys(raw.mcpServers).length === 0) check.fail("mcpServers must translate at least one server");
        for (const [key, text] of Object.entries(raw.mcpServers)) {
          if (check.object(text, `mcpServers.${key}`)) {
            check.string(text.displayName, `mcpServers.${key}.displayName`);
            check.string(text.description, `mcpServers.${key}.description`);
          }
        }
      }
    }

    if (check.object(raw.skills, "skills")) {
      for (const [dir, text] of Object.entries(raw.skills)) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dir)) check.fail(`skills: "${dir}" is not a skill directory name`);
        if (!check.object(text, `skills.${dir}`)) continue;
        check.string(text.displayName, `skills.${dir}.displayName`);
        if (isDefault) check.optionalString(text.description, `skills.${dir}.description`);
        else check.string(text.description, `skills.${dir}.description`);
      }
    }
    check.throwIfAny(source);
  }

  /**
   * The hosted validator's rule, applied to every locale: at most 20
   * characters (code points, so CJK text counts the same as Latin), and no
   * trailing punctuation.
   *
   * @param {unknown} value
   * @param {string} where
   * @param {Checker} check
   */
  static checkShortDescription(value, where, check) {
    if (typeof value !== "string") return;
    if ([...value].length > KIMI_SHORT_DESCRIPTION_MAX) {
      check.fail(`${where} must be at most ${KIMI_SHORT_DESCRIPTION_MAX} characters (got ${[...value].length}: "${value}")`);
    }
    if (TRAILING_PUNCTUATION.test(value)) check.fail(`${where} must not end with punctuation ("${value}")`);
  }

  /**
   * @returns {Readonly<InterfaceText>}
   * @throws {ConfigError} in the default locale, which has none.
   */
  interface() {
    if (!this.data.interface) {
      throw new ConfigError(`translations "${this.locale}"`, ["interface text is only available for translated locales"]);
    }
    return this.data.interface;
  }

  /**
   * @param {string} serverKey
   * @returns {Readonly<ServerText> | undefined}
   */
  server(serverKey) {
    return this.data.mcpServers?.[serverKey];
  }

  /**
   * @param {string} skillDir
   * @returns {Readonly<SkillText>}
   * @throws {ConfigError} when the skill has no entry; callers run `assertCovers` first for a full report.
   */
  skill(skillDir) {
    const text = this.data.skills[skillDir];
    if (!text) throw new ConfigError(`translations "${this.locale}"`, [`skills.${skillDir} is missing`]);
    return text;
  }

  /**
   * Fails with every gap at once: a built skill without an entry, an entry
   * for a skill that is not built (a rename or removal nobody followed up),
   * or, in a translated locale, a server without text.
   *
   * @param {{ skillDirs: readonly string[], serverKey: string }} shipped What the package actually contains.
   * @throws {ConfigError}
   */
  assertCovers({ skillDirs, serverKey }) {
    const problems = [];
    const translated = new Set(Object.keys(this.data.skills));
    for (const dir of skillDirs) {
      if (!translated.has(dir)) problems.push(`skills.${dir} is missing (add its displayName${this.isDefault ? "" : " and description"})`);
    }
    for (const dir of translated) {
      if (!skillDirs.includes(dir)) problems.push(`skills.${dir} names a skill the package does not ship`);
    }
    if (!this.isDefault && !this.server(serverKey)) problems.push(`mcpServers.${serverKey} is missing`);
    if (problems.length > 0) throw new ConfigError(`translations "${this.locale}"`, problems);
  }
}
