// @ts-check
import { readFile } from "node:fs/promises";
import { ConfigError } from "../errors.mjs";
import { isPlainObject } from "../util/object.mjs";

/**
 * Collects structural problems for a config object so they can be reported together.
 */
export class Checker {
  /** @type {string[]} */ problems = [];

  /**
   * @param {unknown} value
   * @param {string} where
   * @returns {value is string}
   */
  string(value, where) {
    if (typeof value === "string" && value.trim() !== "") return true;
    this.problems.push(`${where} must be a non-empty string`);
    return false;
  }

  /**
   * @param {unknown} value
   * @param {string} where
   * @returns {value is string | undefined}
   */
  optionalString(value, where) {
    return value === undefined || this.string(value, where);
  }

  /**
   * @param {unknown} value
   * @param {string} where
   * @returns {value is Record<string, unknown>}
   */
  object(value, where) {
    if (isPlainObject(value)) return true;
    this.problems.push(`${where} must be an object`);
    return false;
  }

  /**
   * @param {unknown} value
   * @param {string} where
   * @returns {value is string[]}
   */
  stringArray(value, where) {
    if (Array.isArray(value) && value.every(item => typeof item === "string" && item !== "")) {
      return true;
    }
    this.problems.push(`${where} must be an array of non-empty strings`);
    return false;
  }

  /**
   * @param {unknown} value
   * @param {string} where
   * @returns {value is unknown[]}
   */
  array(value, where) {
    if (Array.isArray(value)) return true;
    this.problems.push(`${where} must be an array`);
    return false;
  }

  /** @param {string} problem */
  fail(problem) {
    this.problems.push(problem);
  }

  /** @param {string} source */
  throwIfAny(source) {
    if (this.problems.length > 0) throw new ConfigError(source, this.problems);
  }
}

/**
 * @param {string} file
 * @returns {Promise<unknown>}
 */
export async function readJsonFile(file) {
  const text = await readFile(file, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ConfigError(file, [`invalid JSON: ${/** @type {Error} */ (error).message}`]);
  }
}
