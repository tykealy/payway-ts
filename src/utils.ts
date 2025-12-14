/**
 * Trim utility function that only trims strings, passes through other types
 * @param value - The value to trim (string, null, undefined, or any other type)
 * @returns The trimmed string if input is string, otherwise returns the value as-is
 */
export function trim<T = string | null | undefined>(value: T): T {
  if (typeof value === 'string') return value.trim() as T;
  return value;
}
