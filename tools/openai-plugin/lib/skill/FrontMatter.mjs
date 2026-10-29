// @ts-check
import { SkillError } from "../errors.mjs";

const OPEN = "---\n";
const CLOSE = "\n---\n";
const KEY_LINE = /^([A-Za-z][\w-]*):(?:[ \t]+(.*))?$/;

/** YAML words that would be read as booleans, nulls, or numbers if left unquoted. */
const YAML_RESERVED = /^(?:true|false|yes|no|on|off|null|~|[-+]?(?:\d[\d_]*)?\.?\d+(?:e[-+]?\d+)?)$/i;

/**
 * Strict codec for the flat `key: value` YAML front matter used by SKILL.md files.
 *
 * Only single-line scalar values are supported. Anything else (nested maps, lists,
 * block scalars) is rejected rather than guessed at, so a malformed header fails the
 * build instead of shipping a skill the OpenAI importer cannot read.
 */
export class FrontMatter {
  /**
   * @param {string} text Full SKILL.md contents.
   * @param {string} [source] Label used in error messages.
   * @returns {{ data: Record<string, string>, body: string }}
   */
  static parse(text, source = "SKILL.md") {
    if (!text.startsWith(OPEN)) {
      throw new SkillError(`${source}: front matter must start with "---" on the first line`);
    }
    const end = text.indexOf(CLOSE, OPEN.length - 1);
    if (end === -1) {
      throw new SkillError(`${source}: front matter is not closed with "---"`);
    }

    /** @type {Record<string, string>} */
    const data = {};
    const header = text.slice(OPEN.length, end);
    for (const [index, line] of header.split("\n").entries()) {
      if (line.trim() === "") continue;
      const match = KEY_LINE.exec(line);
      if (!match) {
        throw new SkillError(`${source}: unsupported front matter on line ${index + 2}: ${line}`);
      }
      const [, key, raw = ""] = match;
      if (Object.hasOwn(data, key)) {
        throw new SkillError(`${source}: duplicate front matter key "${key}"`);
      }
      data[key] = FrontMatter.#parseScalar(raw.trim(), `${source}:${index + 2}`);
    }

    return { data, body: text.slice(end + CLOSE.length) };
  }

  /**
   * @param {Readonly<Record<string, string>>} data
   * @param {string} body
   * @returns {string}
   */
  static serialize(data, body) {
    const lines = Object.entries(data).map(
      ([key, value]) => `${key}: ${FrontMatter.formatScalar(value)}`,
    );
    return `${OPEN}${lines.join("\n")}${CLOSE}${body}`;
  }

  /**
   * Emits a plain scalar when YAML reads it back unchanged, otherwise a
   * double-quoted scalar (JSON string syntax is valid YAML).
   *
   * @param {string} value
   * @returns {string}
   */
  static formatScalar(value) {
    if (value.includes("\n")) {
      throw new SkillError("front matter values must be single-line");
    }
    const needsQuotes =
      value === "" ||
      value !== value.trim() ||
      /^[-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
      value.includes(": ") ||
      value.includes(" #") ||
      value.endsWith(":") ||
      YAML_RESERVED.test(value);
    return needsQuotes ? JSON.stringify(value) : value;
  }

  /**
   * @param {string} raw
   * @param {string} location
   * @returns {string}
   */
  static #parseScalar(raw, location) {
    if (raw.startsWith('"')) {
      try {
        const value = JSON.parse(raw);
        if (typeof value === "string") return value;
      } catch {
        // Fall through to the error below.
      }
      throw new SkillError(`${location}: invalid double-quoted value`);
    }
    if (raw.startsWith("'")) {
      if (raw.length < 2 || !raw.endsWith("'")) {
        throw new SkillError(`${location}: invalid single-quoted value`);
      }
      return raw.slice(1, -1).replaceAll("''", "'");
    }
    if (raw === "|" || raw === ">" || /^[|>][-+]?\d*$/.test(raw)) {
      throw new SkillError(`${location}: block scalars are not supported`);
    }
    return raw;
  }
}
