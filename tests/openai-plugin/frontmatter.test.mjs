import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { SkillError } from "../../tools/openai-plugin/lib/errors.mjs";
import { FrontMatter } from "../../tools/openai-plugin/lib/skill/FrontMatter.mjs";
import { SkillRepository } from "../../tools/openai-plugin/lib/source/SkillRepository.mjs";
import { REPO_ROOT } from "./helpers.mjs";

test("parses flat key/value front matter and preserves the body", () => {
  const { data, body } = FrontMatter.parse("---\nname: demo\ndescription: Does a thing.\n---\n\n# Demo\n");
  assert.deepEqual(data, { name: "demo", description: "Does a thing." });
  assert.equal(body, "\n# Demo\n");
});

test("round-trips every real skill header byte-for-byte", async () => {
  const repo = new SkillRepository(path.join(REPO_ROOT, "skills"));
  for (const name of await repo.names()) {
    const text = await readFile(path.join(repo.root, name, "SKILL.md"), "utf8");
    const { data, body } = FrontMatter.parse(text, name);
    assert.equal(FrontMatter.serialize(data, body), text, `${name} should round-trip`);
  }
});

test("quotes values that YAML would otherwise misread", () => {
  for (const value of ["Use when: asked", "true", "42", "- dash", "trailing:", "a #comment", ""]) {
    const text = FrontMatter.serialize({ description: value }, "\nbody\n");
    assert.match(text, /description: "/, `"${value}" should be quoted`);
    assert.equal(FrontMatter.parse(text).data.description, value);
  }
  assert.equal(FrontMatter.formatScalar("Plain text, safe."), "Plain text, safe.");
});

test("reads quoted scalars", () => {
  const { data } = FrontMatter.parse(`---\na: "x: \\"y\\""\nb: 'it''s'\n---\n`);
  assert.deepEqual(data, { a: 'x: "y"', b: "it's" });
});

test("rejects unsupported or malformed front matter", () => {
  const cases = [
    "no front matter",
    "---\nname: x\n",
    "---\nname: x\n  continued\n---\n",
    "---\nname: x\nname: y\n---\n",
    "---\ndescription: >\n---\n",
    "---\nlist:\n- a\n---\n",
  ];
  for (const text of cases) {
    assert.throws(() => FrontMatter.parse(text), SkillError, JSON.stringify(text));
  }
});
