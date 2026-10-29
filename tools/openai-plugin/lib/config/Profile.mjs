// @ts-check
import { existsSync } from "node:fs";
import path from "node:path";
import { ConfigError } from "../errors.mjs";

export const PROFILES_DIR = "profiles";
const PROFILE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * One plugin's declarative inputs: where its listing config, transform
 * config, overlay skills, and assets live.
 *
 * The default profile is `openai/` itself. Named profiles live under
 * `openai/profiles/<name>/` with the same four inputs, so a second plugin is a
 * content directory rather than a code change.
 */
export class Profile {
  /** @type {string} */ name;
  /** @type {string} */ root;

  /** @param {{ name: string, root: string }} init */
  constructor({ name, root }) {
    this.name = name;
    this.root = path.resolve(root);
    Object.freeze(this);
  }

  /**
   * @param {string} openaiRoot
   * @returns {Profile}
   */
  static default(openaiRoot) {
    return new Profile({ name: "default", root: openaiRoot });
  }

  /**
   * @param {string} openaiRoot
   * @param {string} name
   * @returns {Profile}
   */
  static named(openaiRoot, name) {
    if (!PROFILE_NAME.test(name)) {
      throw new ConfigError(`profile "${name}"`, ["profile names use lowercase letters, digits, and single hyphens"]);
    }
    const root = path.join(openaiRoot, PROFILES_DIR, name);
    if (!existsSync(root)) {
      throw new ConfigError(`profile "${name}"`, [`no such directory: ${root}`]);
    }
    return new Profile({ name, root });
  }

  /**
   * @param {string} openaiRoot
   * @param {string | undefined} name `undefined` selects the default profile.
   * @returns {Profile}
   */
  static resolve(openaiRoot, name) {
    return name === undefined ? Profile.default(openaiRoot) : Profile.named(openaiRoot, name);
  }

  get pluginConfig() {
    return path.join(this.root, "plugin.config.json");
  }

  get transformConfig() {
    return path.join(this.root, "transform.config.json");
  }

  get skills() {
    return path.join(this.root, "skills");
  }

  /** Listing image paths (`./assets/...`) resolve against this directory. */
  get assets() {
    return this.root;
  }
}
