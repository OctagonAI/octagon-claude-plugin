// @ts-check
import { Rule } from "../Rule.mjs";

/**
 * Paths that must never ship: Claude-only components, lifecycle hooks, app
 * references, environment files, dependencies, VCS data, and OS metadata.
 *
 * @type {readonly { pattern: RegExp, reason: string, code?: string }[]}
 */
const FORBIDDEN_PATHS = [
  { pattern: /^hooks(?:\/|$)|(?:^|\/)hooks\.json$/, reason: "lifecycle hooks cannot be submitted" },
  { pattern: /^(?:agents|commands)\//, reason: "Claude agents and commands must be converted to skills" },
  { pattern: /^\.claude-plugin\//, reason: "Claude manifests are not part of the OpenAI package" },
  { pattern: /(?:^|\/)\.app\.json$/, reason: "app references cannot be submitted", code: "app_configuration_excluded" },
  { pattern: /(?:^|\/)\.env(?:\.|$)/, reason: "environment files may contain secrets" },
  { pattern: /(?:^|\/)node_modules\//, reason: "dependencies do not belong in the package" },
  { pattern: /(?:^|\/)\.git(?:\/|$)/, reason: "VCS metadata does not belong in the package" },
  { pattern: /(?:^|\/)(?:\.DS_Store|Thumbs\.db|__MACOSX\/|\._[^/]*$)/, reason: "OS metadata does not belong in the package" },
];

/** Rejects forbidden files anywhere in the package. */
export class ForbiddenContentRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    return pkg.files.flatMap(file =>
      FORBIDDEN_PATHS.filter(({ pattern }) => pattern.test(file)).map(({ reason, code }) =>
        this.error(reason, { path: file, code }),
      ),
    );
  }
}
