/** Sanitize user input: strip shell metacharacters, limit length */
export function sanitizeInput(value: string): string {
  return value
    .replace(/[;&|`$(){}[\]!#<>\\]/g, '')
    .slice(0, 500)
    .trim()
}
