// @ts-check

/**
 * Recursively freezes plain objects and arrays.
 *
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads a nested value, e.g. `pick(manifest, ["extensions", "com.openai", "review"])`.
 * Returns `undefined` as soon as an intermediate value is not an object.
 *
 * @param {unknown} target
 * @param {string[]} keys
 * @returns {unknown}
 */
export function pick(target, keys) {
  let current = target;
  for (const key of keys) {
    if (!isPlainObject(current)) return undefined;
    current = current[key];
  }
  return current;
}
