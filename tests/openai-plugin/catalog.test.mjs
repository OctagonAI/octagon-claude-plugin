import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { SkillCatalog } from "../../tools/openai-plugin/lib/catalog/SkillCatalog.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import { SkillRepository } from "../../tools/openai-plugin/lib/source/SkillRepository.mjs";
import { ReplaceText } from "../../tools/openai-plugin/lib/transform/ReplaceText.mjs";
import { skillText, tempDir, writeTree } from "./helpers.mjs";

async function fixture(t) {
  const root = await tempDir(t);
  await writeTree(root, {
    "source/alpha/SKILL.md": skillText("alpha", "Alpha via Claude."),
    "source/alpha/references/a.md": "ref",
    "source/alpha/.DS_Store": "junk",
    "source/beta/SKILL.md": skillText("beta", "Beta."),
    "source/gamma/SKILL.md": skillText("gamma", "Gamma."),
    "source/broken/notes.md": "no skill file",
    "overlay/beta/SKILL.md": skillText("beta", "Beta for OpenAI."),
    "overlay/delta/SKILL.md": skillText("delta", "Delta."),
  });
  return {
    source: new SkillRepository(path.join(root, "source")),
    overlay: new SkillRepository(path.join(root, "overlay")),
    transform: new ReplaceText({ find: "Claude", replace: "the model" }),
  };
}

test("merges transformed source skills with overlay skills", async t => {
  const deps = await fixture(t);
  const result = await new SkillCatalog({ ...deps, exclude: ["gamma"] }).build();

  assert.deepEqual(result.skills.map(skill => skill.name), ["alpha", "beta", "delta"]);
  assert.deepEqual(result.transformed, ["alpha"]);
  assert.deepEqual(result.added, ["delta"]);
  assert.deepEqual(result.overridden, ["beta"]);
  assert.deepEqual(result.excluded, ["gamma"]);
  assert.deepEqual(result.incomplete, ["broken"]);

  const [alpha, beta] = result.skills;
  assert.equal(alpha.description, "Alpha via the model.");
  assert.deepEqual([...alpha.files.keys()], ["references/a.md"], "junk files are skipped");
  assert.equal(beta.description, "Beta for OpenAI.", "overlay replaces the source skill untouched");
});

test("rejects inconsistent configuration", async t => {
  const deps = await fixture(t);
  for (const options of [
    { exclude: ["missing"] },
    { exclude: ["delta"] },
    { exclude: [], requiredSources: ["missing"] },
    { exclude: ["gamma"], requiredSources: ["gamma"] },
    { exclude: [], requiredSources: ["beta"] },
  ]) {
    await assert.rejects(new SkillCatalog({ ...deps, ...options }).build(), ConfigError, JSON.stringify(options));
  }
});
