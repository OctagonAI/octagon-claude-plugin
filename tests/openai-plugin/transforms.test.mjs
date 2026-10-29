import assert from "node:assert/strict";
import test from "node:test";
import { TransformConfig } from "../../tools/openai-plugin/lib/config/TransformConfig.mjs";
import { ConfigError, SkillError } from "../../tools/openai-plugin/lib/errors.mjs";
import { SkillDocument } from "../../tools/openai-plugin/lib/skill/SkillDocument.mjs";
import { RemoveFiles } from "../../tools/openai-plugin/lib/transform/RemoveFiles.mjs";
import { ReplaceSection } from "../../tools/openai-plugin/lib/transform/ReplaceSection.mjs";
import { ReplaceText } from "../../tools/openai-plugin/lib/transform/ReplaceText.mjs";
import { ScopedTransform } from "../../tools/openai-plugin/lib/transform/ScopedTransform.mjs";
import { skillText } from "./helpers.mjs";

function doc(name = "demo") {
  return SkillDocument.fromText(
    name,
    skillText(name, "Quotes using the Octagon Claude plugin.", "\n## Prerequisites\n\nInstall it.\n\n## Use\n\nCall it ($5).\n"),
    new Map([
      ["references/mcp-setup.md", Buffer.from("setup")],
      ["references/notes.md", Buffer.from("Octagon Claude plugin notes")],
    ]),
  );
}

test("documents are immutable; transforms return new instances", () => {
  const original = doc();
  const changed = new ReplaceText({ find: "Octagon Claude plugin", replace: "Octagon" }).apply(original);
  assert.notEqual(changed, original);
  assert.match(original.description, /Claude/);
  assert.throws(() => {
    // @ts-expect-error verifying runtime immutability
    original.body = "x";
  }, TypeError);
});

test("ReplaceText covers description, body, and companion Markdown", () => {
  const result = new ReplaceText({ find: "Octagon Claude plugin", replace: "Octagon" }).apply(doc());
  assert.equal(result.description, "Quotes using the Octagon.");
  assert.equal(result.files.get("references/notes.md")?.toString(), "Octagon notes");
});

test("ReplaceText treats literal replacements literally", () => {
  const result = new ReplaceText({ find: "($5)", replace: "($$1)" }).apply(doc());
  assert.match(result.body, /Call it \(\$\$1\)\./);
});

test("ReplaceText can be limited to one file", () => {
  const result = new ReplaceText({ find: "Claude", replace: "X", file: "references/notes.md" }).apply(doc());
  assert.match(result.description, /Claude/);
  assert.match(result.files.get("references/notes.md")?.toString() ?? "", /X/);
});

test("strict transforms fail loudly when they no longer match", () => {
  assert.throws(() => new ReplaceText({ find: "absent", replace: "", strict: true }).apply(doc()), SkillError);
  assert.throws(() => new ReplaceSection({ heading: "## Absent", strict: true }).apply(doc()), SkillError);
  assert.doesNotThrow(() => new ReplaceText({ find: "absent", replace: "" }).apply(doc()));
});

test("ReplaceSection and RemoveFiles", () => {
  const result = new RemoveFiles(["references/mcp-setup.md"]).apply(
    new ReplaceSection({ heading: "## Prerequisites", body: "Connect Octagon." }).apply(doc()),
  );
  assert.match(result.body, /## Prerequisites\n\nConnect Octagon\.\n\n## Use/);
  assert.deepEqual([...result.files.keys()], ["references/notes.md"]);
});

test("ScopedTransform applies only to the selected skills", () => {
  const inner = new ReplaceText({ find: "Install it.", replace: "Done." });
  assert.match(new ScopedTransform({ only: ["other"] }, inner).apply(doc()).body, /Install it\./);
  assert.match(new ScopedTransform({ except: ["other"] }, inner).apply(doc()).body, /Done\./);
});

test("the configured pipeline is idempotent", () => {
  const config = new TransformConfig({
    excludeSkills: [],
    removeFiles: ["references/mcp-setup.md"],
    sections: [{ heading: "## Prerequisites", body: "Connect Octagon." }],
    substitutions: [{ find: "Octagon Claude plugin", replace: "Octagon" }],
    skillEdits: { demo: { substitutions: [{ file: "SKILL.md", find: "Call it", replace: "Invoke it" }] } },
    forbiddenPatterns: [],
  });
  const once = config.toPipeline().apply(doc());
  // Strict per-skill edits are expected to stop matching once applied, so re-run only the global steps.
  const globalOnly = new TransformConfig({ ...config.data, skillEdits: {} }).toPipeline();
  assert.equal(globalOnly.apply(once).toSkillText(), once.toSkillText());
  assert.match(once.body, /Invoke it/);
});

test("per-skill section overrides win over the global section rewrite", () => {
  const config = new TransformConfig({
    excludeSkills: [],
    removeFiles: [],
    sections: [{ heading: "## Prerequisites", body: "Global." }],
    substitutions: [],
    skillEdits: { demo: { sections: [{ heading: "## Prerequisites", body: "Specific." }] } },
    forbiddenPatterns: [],
  });
  assert.match(config.toPipeline().apply(doc()).body, /Specific\./);
  assert.match(config.toPipeline().apply(doc("other")).body, /Global\./);
});

test("TransformConfig.check reports every structural problem at once", () => {
  assert.throws(
    () => TransformConfig.check({ excludeSkills: "x", removeFiles: [], sections: [{ heading: "no hash" }], substitutions: [{ replace: 1 }], skillEdits: {}, forbiddenPatterns: [{ pattern: "(" }] }, "test"),
    (/** @type {ConfigError} */ error) => error instanceof ConfigError && error.problems.length >= 5,
  );
});
