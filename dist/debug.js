import { createHash } from "node:crypto";
const DEFAULT_DEBUG_ENABLED = false;
function parseBooleanFlag(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "") {
        return defaultValue;
    }
    if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
    }
    return defaultValue;
}
export const OCTAGON_MCP_DEBUG = parseBooleanFlag(process.env.OCTAGON_MCP_DEBUG, DEFAULT_DEBUG_ENABLED);
function hashValue(value) {
    return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
export function summarizeDebugIdentifier(value) {
    if (!value) {
        return null;
    }
    return `sha256:${hashValue(value)}`;
}
export function summarizeDebugPrompt(prompt) {
    return {
        promptLength: prompt.length,
        promptHash: `sha256:${hashValue(prompt)}`,
    };
}
function safeSerialize(payload) {
    if (typeof payload === "string") {
        return payload;
    }
    try {
        return JSON.stringify(payload, null, 2);
    }
    catch (error) {
        return `<<unserializable payload: ${String(error)}>>`;
    }
}
export function debugLog(label, payload) {
    if (!OCTAGON_MCP_DEBUG) {
        return;
    }
    if (payload === undefined) {
        console.error(`[octagon-claude-plugin][debug] ${label}`);
        return;
    }
    console.error(`[octagon-claude-plugin][debug] ${label}\n${safeSerialize(payload)}`);
}
