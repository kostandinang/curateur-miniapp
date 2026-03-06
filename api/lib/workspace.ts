import { existsSync, readFileSync, readdirSync, statSync, type Stats } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

export const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/root/.openclaw/workspace'

/** Join path segments relative to WORKSPACE_DIR */
export function workspacePath(...segments: string[]): string {
  return path.join(WORKSPACE_DIR, ...segments)
}

/** Async JSON file reader with fallback */
export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

/** Sync JSON file reader with fallback */
export function readJsonFileSync<T>(filePath: string, fallback: T): T {
  try {
    const content = readFileSync(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return fallback
  }
}

/** Check if a file exists */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

/** Read file content, returns string or null on failure */
export function readFileContent(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

/** List directory contents, returns empty array on failure */
export function listDir(dirPath: string): string[] {
  try {
    return readdirSync(dirPath)
  } catch {
    return []
  }
}

/** Get file stats, returns null on failure */
export function getFileStat(filePath: string): Stats | null {
  try {
    return statSync(filePath)
  } catch {
    return null
  }
}
