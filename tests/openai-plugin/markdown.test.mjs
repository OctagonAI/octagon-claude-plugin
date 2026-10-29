import assert from "node:assert/strict";
import test from "node:test";
import { relativeLinks, replaceSection } from "../../tools/openai-plugin/lib/skill/markdown.mjs";

const DOC = [
  "# Title",
  "",
  "## Prerequisites",
  "",
  "Old setup.",
  "",
  "### Nested",
  "Nested setup.",
  "",
  "## Workflow",
  "",
  "```bash",
  "## not a heading",
  "```",
  "",
].join("\n");

test("replaces a section through its subsections, up to the next same-level heading", () => {
  const { text, count } = replaceSection(DOC, "## Prerequisites", "New setup.");
  assert.equal(count, 1);
  assert.equal(text, ["# Title", "", "## Prerequisites", "", "New setup.", "", "## Workflow", "", "```bash", "## not a heading", "```", ""].join("\n"));
});

test("removes a section when body is null", () => {
  const { text } = replaceSection(DOC, "### Nested", null);
  assert.doesNotMatch(text, /Nested/);
  assert.match(text, /Old setup\.\n\n## Workflow/);
});

test("ignores headings inside fenced code blocks", () => {
  const { text, count } = replaceSection(DOC, "## not a heading", "x");
  assert.equal(count, 0);
  assert.equal(text, DOC);
});

test("extracts relative links and skips URLs, anchors, and code", () => {
  const links = relativeLinks(
    "[a](references/a.md) [b](https://x.y) [c](#top) ![d](img/d.png \"t\") [e](b.md#part)\n```\n[f](f.md)\n```\n",
  );
  assert.deepEqual(links, ["references/a.md", "img/d.png", "b.md"]);
});

test("fences follow the CommonMark close rule", () => {
  const nested = [
    "## Keep",
    "````markdown",
    "```",
    "## not a heading",
    "```",
    "[not a link](x.md)",
    "````",
    "## Drop",
    "gone",
    "",
  ].join("\n");
  const { text, count } = replaceSection(nested, "## Drop", null);
  assert.equal(count, 1);
  assert.match(text, /## not a heading/, "a shorter inner fence does not close the outer block");
  assert.doesNotMatch(text, /gone/);
  assert.deepEqual(relativeLinks(nested), []);

  const mixed = "```\n~~~\n## inside\n```\n## after\n";
  assert.equal(replaceSection(mixed, "## inside", null).count, 0, "a tilde run does not close a backtick block");
  assert.equal(replaceSection(mixed, "## after", null).count, 1);

  const indented = "- item\n\n   ```\n   ## inside list fence\n   ```\n";
  assert.equal(replaceSection(indented, "## inside list fence", null).count, 0, "fences may be indented up to three spaces");
});
