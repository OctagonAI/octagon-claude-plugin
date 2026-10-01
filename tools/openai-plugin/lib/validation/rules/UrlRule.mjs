// @ts-check
import { MANIFEST_PATH, OPENAI_EXTENSION } from "../../manifest/ManifestBuilder.mjs";
import { pick } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";

/** Listing URLs that remote MCP review requires. */
const REQUIRED = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"];

/**
 * @callback Fetcher
 * @param {string} url
 * @returns {Promise<{ ok: boolean, status: number }>}
 */

/**
 * Public URLs must be HTTPS without embedded credentials. With `online`, each
 * URL must also answer 2xx after redirects, as the reviewer will see it.
 */
export class UrlRule extends Rule {
  /** @type {boolean} */ #online;
  /** @type {Fetcher} */ #fetch;

  /**
   * @param {{ online?: boolean, fetcher?: Fetcher }} [options]
   */
  constructor({ online = false, fetcher = defaultFetcher } = {}) {
    super();
    this.#online = online;
    this.#fetch = fetcher;
  }

  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const manifest = pkg.manifestObject();
    if (!manifest) return [];
    const at = { path: MANIFEST_PATH };

    /** @type {[string, unknown][]} */
    const urls = [
      ...REQUIRED.map(field => /** @type {[string, unknown]} */ ([`interface.${field}`, pick(manifest, ["interface", field])])),
      ["homepage", manifest.homepage],
      ["author.url", pick(manifest, ["author", "url"])],
      ["review.demo_recording_url", pick(manifest, ["extensions", OPENAI_EXTENSION, "review", "demo_recording_url"])],
    ];

    const findings = [];
    /** @type {[string, string][]} */
    const reachable = [];
    for (const [field, value] of urls) {
      const required = REQUIRED.some(name => field === `interface.${name}`);
      if (value === undefined) {
        if (required) findings.push(this.error(`${field} is required for MCP review`, at));
        continue;
      }
      const problem = describeUrlProblem(value);
      if (problem) {
        findings.push(this.error(`${field} ${problem}`, at));
      } else {
        reachable.push([field, /** @type {string} */ (value)]);
      }
    }

    if (this.#online) {
      const results = await Promise.all(
        reachable.map(async ([field, url]) => {
          try {
            const response = await this.#fetch(url);
            return response.ok ? null : this.error(`${field} returned HTTP ${response.status}: ${url}`, at);
          } catch (error) {
            return this.error(`${field} is unreachable (${/** @type {Error} */ (error).message}): ${url}`, at);
          }
        }),
      );
      findings.push(...results.filter(finding => finding !== null));
    }
    return findings;
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function describeUrlProblem(value) {
  if (typeof value !== "string") return "must be a string";
  if (value.length > 2048) return "must be ≤2,048 characters";
  let url;
  try {
    url = new URL(value);
  } catch {
    return `is not a valid URL: ${value}`;
  }
  if (url.protocol !== "https:") return `must use HTTPS: ${value}`;
  if (url.username || url.password) return "must not embed credentials";
  return null;
}

/** @type {Fetcher} */
async function defaultFetcher(url) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  await response.body?.cancel();
  return { ok: response.ok, status: response.status };
}
