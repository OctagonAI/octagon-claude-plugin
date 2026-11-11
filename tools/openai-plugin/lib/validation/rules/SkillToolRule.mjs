// @ts-check
import { SKILLS_DIR } from "../../manifest/ManifestBuilder.mjs";
import { Rule } from "../Rule.mjs";

/** Any Octagon model name as it appears in skill text. */
const AGENT_RE = /octagon-[a-z][a-z0-9-]*-agent\b/g;
/** Headings under which other agents and plugins may be named: routing hints, by design. */
const ROUTING_HEADING_RE = /^#{2,4}\s+(?:when not to use|not this plugin|what the plugin does not do|related plugins)\b/i;
const TOOL_NAME_RE = /"toolName"\s*:\s*"([^"]+)"/g;
const SKILL_REF_RE = /`([a-z0-9]+(?:-[a-z0-9]+)+)`/g;

/**
 * The allocation fence for single-tool plugins.
 *
 * A plugin built around one specialist agent must not ship a skill that leans
 * on another agent: every MCP call block must name the plugin's tool, and no
 * other Octagon agent may be mentioned anywhere in the shipped skill text
 * except under a routing heading ("When not to use", "What the plugin does
 * not do"), where naming the sibling plugin's agent is the point. A skill that
 * references a sibling skill the package does not ship is reported as a
 * warning, so the catalog's cross-links can be trimmed per plugin.
 */
export class SkillToolRule extends Rule {
  /** @type {string} */ #tool;
  /** @type {ReadonlySet<string>} */ #catalogSkills;

  /**
   * @param {{ tool: string, catalogSkills?: readonly string[] }} options
   *   `tool` is the plugin's one MCP tool; `catalogSkills` lists every skill
   *   name that exists in the source catalog, for the cross-reference warning.
   */
  constructor({ tool, catalogSkills = [] }) {
    super();
    this.#tool = tool;
    this.#catalogSkills = new Set(catalogSkills);
  }

  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const findings = [];
    const shipped = new Set(pkg.skills.map(skill => skill.dir));
    const files = pkg.files.filter(file => file.startsWith(`${SKILLS_DIR}/`) && file.endsWith(".md"));
    for (const file of files) {
      const text = await pkg.readText(file);
      findings.push(...this.#checkText(file, text, shipped));
    }
    return findings;
  }

  /**
   * @param {string} file
   * @param {string} text
   * @param {ReadonlySet<string>} shipped
   */
  #checkText(file, text, shipped) {
    const findings = [];
    const lines = text.split("\n");
    let routing = false;
    const foreign = new Map();
    const unshipped = new Map();

    lines.forEach((line, index) => {
      if (/^#{1,6}\s/.test(line)) routing = ROUTING_HEADING_RE.test(line);
      if (routing) return;
      for (const match of line.matchAll(AGENT_RE)) {
        if (match[0] !== this.#tool && !foreign.has(match[0])) foreign.set(match[0], index + 1);
      }
      for (const match of line.matchAll(TOOL_NAME_RE)) {
        if (match[1] !== this.#tool) {
          findings.push(this.error(`MCP call names tool "${match[1]}"; this plugin ships only "${this.#tool}"`, { path: `${file}:${index + 1}` }));
        }
      }
      for (const match of line.matchAll(SKILL_REF_RE)) {
        const name = match[1];
        if (this.#catalogSkills.has(name) && !shipped.has(name) && !unshipped.has(name)) unshipped.set(name, index + 1);
      }
    });

    for (const [agent, line] of foreign) {
      findings.push(this.error(`mentions "${agent}" outside a routing section; a single-tool plugin must not lean on another agent`, { path: `${file}:${line}` }));
    }
    for (const [name, line] of unshipped) {
      findings.push(this.warning(`references skill "${name}", which this plugin does not ship`, { path: `${file}:${line}` }));
    }
    return findings;
  }
}
