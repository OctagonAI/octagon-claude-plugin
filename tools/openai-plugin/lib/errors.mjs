// @ts-check

/** Base class for every failure raised by the OpenAI packaging tool. */
export class PackagingError extends Error {
  /**
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Invalid or inconsistent configuration under `openai/`. */
export class ConfigError extends PackagingError {
  /**
   * @param {string} source File or object the problems were found in.
   * @param {string[]} problems
   */
  constructor(source, problems) {
    super(`${source}:\n${problems.map(problem => `  - ${problem}`).join("\n")}`);
    this.source = source;
    this.problems = problems;
  }
}

/** A skill file could not be parsed or a transform could not be applied. */
export class SkillError extends PackagingError {}

/** An attempt to write outside the staging area, or another output failure. */
export class OutputError extends PackagingError {}
