/**
 * Plugin utilities for handling plugin directories and path operations
 * across different runtime environments (local development vs JSR deployment)
 */

import { dirname, fromFileUrl } from '@std/path';

/**
 * Get the plugin directory path for the calling plugin
 *
 * Automatically handles both JSR (https://) and local (file://) environments:
 * - **JSR mode**: Returns a virtual path extracted from the JSR URL that works for dynamic imports
 * - **Local mode**: Returns the actual filesystem path
 *
 * @param moduleUrl - The `import.meta.url` from the calling plugin
 * @returns The directory path of the calling plugin
 *
 * @example
 * ```typescript
 * // In a plugin file (e.g., server/src/plugins/my-plugin/plugin.ts)
 * const pluginDir = getPluginDir(import.meta.url);
 *
 * // JSR mode:
 * // Returns: "https://jsr.io/@scope/pkg@1.0.0/server/src/plugins/my-plugin"
 * // (Full URL that can be used for dynamic imports)
 *
 * // Local mode:
 * // Returns: "/absolute/path/to/server/src/plugins/my-plugin"
 * // (Filesystem path)
 * ```
 */
export function getPluginDir(moduleUrl: string): string {
  const currentFileUrl = moduleUrl;

  if (currentFileUrl.startsWith('https://')) {
    // JSR mode: Keep the full URL base for dynamic imports
    // e.g., "https://jsr.io/@scope/pkg@1.0.0/server/src/plugins/plugin.ts"
    // becomes "https://jsr.io/@scope/pkg@1.0.0/server/src/plugins"
    const url = new URL(currentFileUrl);
    const dirPath = dirname(url.pathname);
    return `${url.origin}${dirPath}`;
  }

  // Local mode: Convert file:// URL to filesystem path
  return dirname(fromFileUrl(currentFileUrl));
}

/**
 * Expand tilde (~) to the user's home directory in file paths
 *
 * Replaces a leading `~/` with the actual home directory path from environment variables.
 * Works cross-platform by checking both HOME (Unix/macOS) and USERPROFILE (Windows).
 *
 * @param path - The path that may contain a leading tilde
 * @returns The expanded path with home directory, or the original path if no tilde
 *
 * @example
 * ```typescript
 * expandHomePath('~/Documents/file.txt')
 * // Returns: "/Users/username/Documents/file.txt" (on macOS/Linux)
 * // Returns: "C:\Users\username\Documents\file.txt" (on Windows)
 *
 * expandHomePath('/absolute/path/file.txt')
 * // Returns: "/absolute/path/file.txt" (unchanged)
 * ```
 */
export function expandHomePath(path: string): string {
  if (path.startsWith('~/')) {
    const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '';
    return path.replace(/^~/, home);
  }
  return path;
}
