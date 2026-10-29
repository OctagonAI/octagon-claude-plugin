// @ts-check
import { Rule } from "../Rule.mjs";

/** High-signal credential shapes. Placeholders such as `<your-api-key>` don't match. */
const SECRETS = [
  { name: "OpenAI-style secret key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "JSON Web Token", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "bearer token", regex: /\bBearer\s+[A-Za-z0-9._~+/-]{24,}=*/ },
  { name: "private key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "credential assignment",
    regex: /\b(?:api[_-]?key|secret|token|password)\b["']?\s*[:=]\s*["']?(?![<$\{])[A-Za-z0-9_\-+/]{16,}/i,
  },
];

/** Blocks anything that looks like a real credential. The package is public. */
export class SecretScanRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const findings = [];
    for (const file of pkg.textFiles()) {
      const text = await pkg.readText(file);
      for (const { name, regex } of SECRETS) {
        if (regex.test(text)) findings.push(this.error(`possible ${name}`, { path: file }));
      }
    }
    return findings;
  }
}
