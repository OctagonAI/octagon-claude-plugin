import { debugLog, summarizeDebugIdentifier } from "./debug.js";
import { randomUUID } from "node:crypto";
const sessionStateByAnchor = new Map();
const DEFAULT_STDIO_SESSION_ID = `stdio:${randomUUID()}`;
function asNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
function nowIsoString() {
    return new Date().toISOString();
}
export function normalizeToolContext(extra) {
    const normalizedTransportKind = extra?.transportKind ?? "stdio";
    const normalizedSessionId = asNonEmptyString(extra?.sessionId) ??
        (normalizedTransportKind === "stdio" ? DEFAULT_STDIO_SESSION_ID : undefined);
    return {
        sessionId: normalizedSessionId,
        transportKind: normalizedTransportKind,
        signal: extra?.signal,
    };
}
export function resolveSessionAnchor(context) {
    if (context?.transportKind !== "stdio" && context?.sessionId) {
        return {
            key: `transport_session:${context.sessionId}`,
            sessionId: context.sessionId,
            type: "transport_session",
        };
    }
    if (context?.transportKind === "stdio" && context?.sessionId) {
        return {
            key: `stdio_session:${context.sessionId}`,
            sessionId: context.sessionId,
            type: "stdio_session",
        };
    }
    return undefined;
}
function upsertSessionState(context, { activeTool, activeConversationId, lastResponseId, } = {}) {
    const anchor = resolveSessionAnchor(context);
    if (!anchor) {
        return undefined;
    }
    const existing = sessionStateByAnchor.get(anchor.key);
    const timestamp = nowIsoString();
    const nextState = {
        sessionId: anchor.sessionId,
        createdAt: existing?.createdAt ?? timestamp,
        lastSeenAt: timestamp,
        activeConversationId: activeConversationId ?? existing?.activeConversationId,
        lastResponseId: lastResponseId ?? existing?.lastResponseId,
        activeTool: activeTool ?? existing?.activeTool,
    };
    sessionStateByAnchor.set(anchor.key, nextState);
    return nextState;
}
export function getSessionState(context) {
    const anchor = resolveSessionAnchor(context);
    if (!anchor) {
        return;
    }
    const existing = sessionStateByAnchor.get(anchor.key);
    if (!existing) {
        return undefined;
    }
    const touchedState = {
        ...existing,
        lastSeenAt: nowIsoString(),
    };
    sessionStateByAnchor.set(anchor.key, touchedState);
    return touchedState;
}
export function storeOctagonConversation(context, value) {
    return upsertSessionState(context, {
        activeTool: "octagon-agent",
        activeConversationId: value.conversation,
        lastResponseId: value.responseId,
    });
}
export function clearOctagonConversation(context, reason) {
    const anchor = resolveSessionAnchor(context);
    if (!anchor) {
        return;
    }
    const existing = sessionStateByAnchor.get(anchor.key);
    if (!existing) {
        return;
    }
    const hadConversation = Boolean(existing.activeConversationId || existing.lastResponseId);
    const nextState = {
        ...existing,
        lastSeenAt: nowIsoString(),
        activeConversationId: undefined,
        lastResponseId: undefined,
    };
    sessionStateByAnchor.set(anchor.key, nextState);
    if (hadConversation) {
        debugLog("octagon-agent session conversation cleared", {
            sessionId: summarizeDebugIdentifier(context?.sessionId),
            transportKind: context?.transportKind ?? "unknown",
            anchorType: anchor.type,
            anchorKey: summarizeDebugIdentifier(anchor.key),
            reason: reason ?? "unspecified",
        });
    }
}
export function terminateSession(context, reason) {
    const anchor = resolveSessionAnchor(context);
    if (!anchor) {
        return;
    }
    const existing = sessionStateByAnchor.get(anchor.key);
    if (!existing) {
        return;
    }
    sessionStateByAnchor.delete(anchor.key);
    debugLog("mcp session terminated", {
        sessionId: summarizeDebugIdentifier(context?.sessionId),
        transportKind: context?.transportKind ?? "unknown",
        anchorType: anchor.type,
        anchorKey: summarizeDebugIdentifier(anchor.key),
        activeTool: existing.activeTool ?? null,
        activeConversationId: summarizeDebugIdentifier(existing.activeConversationId),
        reason: reason ?? "unspecified",
    });
}
export function resetSessionStateForTests() {
    sessionStateByAnchor.clear();
}
export function getDefaultStdioSessionIdForTests() {
    return DEFAULT_STDIO_SESSION_ID;
}
