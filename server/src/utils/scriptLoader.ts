/**
 * Script loader for managing AppleScript files
 * Supports both compiled scripts and template-based scripts
 *
 * Hybrid loading strategy:
 * 1. Try to load from inlined scripts (scripts/index.ts) for JSR compatibility
 * 2. Fall back to file-based loading for local development
 */

import { join } from '@std/path';
import { decodeBase64 } from '@std/encoding/base64';
import type { Logger } from '@beyondbetter/bb-mcp-server';
import { toError } from '@beyondbetter/bb-mcp-server';
import { renderTemplate } from './templateRenderer.ts';
import { compileAndRun, runAppleScript } from './scriptRunner.ts';
import type { AppleScriptResult } from './errorHandler.ts';

export interface InlinedScript {
  type: 'text' | 'binary';
  content: string;
}

export type InlinedScriptsMap = Record<string, InlinedScript>;

export interface LoadedScript {
  /** Path to the script file */
  path: string;
  /** Whether the script is compiled (.scpt) */
  compiled: boolean;
  /** Whether the script uses templates */
  hasTemplates: boolean;
  /** Script content (only for non-compiled scripts) */
  content?: string;
}

/**
 * Loads a script file and determines its type
 */
export async function loadScript(scriptPath: string, logger?: Logger): Promise<LoadedScript> {
  try {
    const stat = await Deno.stat(scriptPath);

    if (!stat.isFile) {
      throw new Error(`Script path is not a file: ${scriptPath}`);
    }

    const isCompiled = scriptPath.endsWith('.scpt');

    if (isCompiled) {
      // Compiled script - no need to read content
      logger?.debug(`Loaded compiled script: ${scriptPath}`);
      return {
        path: scriptPath,
        compiled: true,
        hasTemplates: false,
      };
    } else {
      // Source script - read and check for templates
      const content = await Deno.readTextFile(scriptPath);
      const hasTemplates = /\$\{[^}]+\}/.test(content);

      logger?.debug(`Loaded source script: ${scriptPath}`, {
        hasTemplates,
        lines: content.split('\n').length,
      });

      return {
        path: scriptPath,
        compiled: false,
        hasTemplates,
        content,
      };
    }
  } catch (error) {
    logger?.error(`Failed to load script: ${scriptPath}`, toError(error), { error });
    throw new Error(
      `Failed to load script ${scriptPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Finds a script file in a plugin's scripts directory
 * Supports both .scpt and .applescript extensions
 */
export async function findScriptInPlugin(
  pluginDir: string,
  scriptName: string,
  logger?: Logger,
): Promise<string | null> {
  const scriptsDir = join(pluginDir, 'scripts');

  // Try different extensions and subdirectories
  const candidates = [
    join(scriptsDir, `${scriptName}.scpt`),
    join(scriptsDir, `${scriptName}.applescript`),
    join(scriptsDir, scriptName, `${scriptName}.scpt`),
    join(scriptsDir, scriptName, `${scriptName}.applescript`),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await Deno.stat(candidate);
      if (stat.isFile) {
        logger?.debug(`Found script: ${candidate}`);
        return candidate;
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  logger?.warn(`Script not found: ${scriptName} in ${scriptsDir}`);
  return null;
}

/**
 * Executes a loaded script with optional template variables
 */
export async function executeScript(
  script: LoadedScript,
  variables?: Record<string, any>,
  args?: string[],
  timeout?: number,
  logger?: Logger,
): Promise<AppleScriptResult> {
  if (script.compiled) {
    // Run compiled script directly with args
    const options: any = { script: script.path };
    if (args !== undefined) options.args = args;
    if (timeout !== undefined) options.timeout = timeout;
    if (logger !== undefined) options.logger = logger;
    return runAppleScript(options);
  } else if (script.hasTemplates && script.content) {
    // Render template and compile/run
    if (!variables) {
      throw new Error('Template variables required for template-based script');
    }

    const rendered = renderTemplate(script.content, variables);
    logger?.debug('Rendered template script', {
      variables: Object.keys(variables),
      lines: rendered.split('\n').length,
    });

    return compileAndRun(rendered, timeout, logger);
  } else {
    // Run source script directly
    const options: any = { script: script.path };
    if (args !== undefined) options.args = args;
    if (timeout !== undefined) options.timeout = timeout;
    if (logger !== undefined) options.logger = logger;
    return runAppleScript(options);
  }
}

/**
 * Helper to load and execute a script in one call
 */
export async function loadAndExecuteScript(
  scriptPath: string,
  variables?: Record<string, any>,
  args?: string[],
  timeout?: number,
  logger?: Logger,
): Promise<AppleScriptResult> {
  const script = await loadScript(scriptPath, logger);
  return executeScript(script, variables, args, timeout, logger);
}

/**
 * Try to load inlined scripts from a plugin's scripts/index.ts
 * Returns null if not available (no index.ts or not running from JSR)
 */
async function tryLoadInlinedScripts(pluginDir: string, logger?: Logger): Promise<InlinedScriptsMap | null> {
  try {
    // Attempt to dynamically import the inlined scripts module
    // This will only succeed if scripts/index.ts exists (generated by build:jsr)
    const indexPath = `${pluginDir}/scripts/index.ts`;
    const scriptsModule = await import(indexPath);
    logger?.debug('Loaded inlined scripts', {
      pluginDir,
      count: Object.keys(scriptsModule.INLINED_SCRIPTS || {}).length,
    });
    return scriptsModule.INLINED_SCRIPTS;
  } catch {
    // Index doesn't exist or import failed - fall back to file-based loading
    logger?.debug('Inlined scripts not available, using file-based loading', { pluginDir });
    return null;
  }
}

/**
 * Execute a script from inlined scripts map
 */
async function executeFromInlinedScripts(
  scriptName: string,
  inlinedScripts: InlinedScriptsMap,
  variables?: Record<string, any>,
  args?: string[],
  timeout?: number,
  logger?: Logger,
): Promise<AppleScriptResult> {
  // Try to find script with exact name first
  let script = inlinedScripts[scriptName];
  let fullScriptName = scriptName;

  // If not found and no extension, try adding extensions
  if (!script && !scriptName.includes('.')) {
    const candidates = [
      `${scriptName}.applescript`,
      `${scriptName}.scpt`,
    ];

    for (const candidate of candidates) {
      if (inlinedScripts[candidate]) {
        script = inlinedScripts[candidate];
        fullScriptName = candidate;
        break;
      }
    }
  }

  // Try looking in subdirectories (e.g., 'finder/reveal_in_finder.applescript')
  if (!script) {
    for (const [key, value] of Object.entries(inlinedScripts)) {
      if (
        key.endsWith(`/${scriptName}`) ||
        key.endsWith(`/${scriptName}.applescript`) ||
        key.endsWith(`/${scriptName}.scpt`)
      ) {
        script = value;
        fullScriptName = key;
        break;
      }
    }
  }

  if (!script) {
    throw new Error(`Inlined script not found: ${scriptName}`);
  }

  logger?.debug(`Executing inlined script: ${fullScriptName}`, {
    type: script.type,
    hasVariables: !!variables,
    hasArgs: !!args,
  });

  if (script.type === 'binary') {
    // Compiled .scpt file - decode base64 and write to temp file
    return executeCompiledInlinedScript(script.content, args, timeout, logger);
  } else {
    // Text .applescript file - check for templates and execute
    return executeTextInlinedScript(script.content, variables, args, timeout, logger);
  }
}

/**
 * Execute a compiled script from base64-encoded binary data
 */
async function executeCompiledInlinedScript(
  base64Content: string,
  args?: string[],
  timeout?: number,
  logger?: Logger,
): Promise<AppleScriptResult> {
  // Decode base64 to binary
  const binaryContent = decodeBase64(base64Content);

  // Create a temporary file for the compiled script
  const tempFile = await Deno.makeTempFile({ suffix: '.scpt' });

  try {
    // Write binary content to temp file
    await Deno.writeFile(tempFile, binaryContent);

    // Execute the compiled script
    const options: any = { script: tempFile };
    if (args !== undefined) options.args = args;
    if (timeout !== undefined) options.timeout = timeout;
    if (logger !== undefined) options.logger = logger;

    return await runAppleScript(options);
  } finally {
    // Clean up temp file
    try {
      await Deno.remove(tempFile);
    } catch (error) {
      logger?.warn('Failed to remove temporary script file', { tempFile, error });
    }
  }
}

/**
 * Execute a text AppleScript with optional template rendering
 */
async function executeTextInlinedScript(
  content: string,
  variables?: Record<string, any>,
  args?: string[],
  timeout?: number,
  logger?: Logger,
): Promise<AppleScriptResult> {
  const hasTemplates = /\$\{[^}]+\}/.test(content);

  if (hasTemplates && variables) {
    // Render template and compile/run
    const rendered = renderTemplate(content, variables);
    logger?.debug('Rendered inlined template script', {
      variables: Object.keys(variables),
      lines: rendered.split('\n').length,
    });

    return compileAndRun(rendered, timeout, logger);
  } else if (hasTemplates && !variables) {
    throw new Error('Template variables required for template-based script');
  } else {
    // No templates - compile and run directly
    return compileAndRun(content, timeout, logger);
  }
}

/**
 * Helper to find and execute a script from a plugin
 *
 * Hybrid loading strategy:
 * 1. Try to load from inlined scripts (scripts/index.ts) - for JSR compatibility
 * 2. Fall back to file-based loading - for local development
 */
export async function findAndExecuteScript(
  pluginDir: string,
  scriptName: string,
  variables?: Record<string, any>,
  args?: string[],
  timeout?: number,
  logger?: Logger,
): Promise<AppleScriptResult> {
  // Try inlined scripts first (JSR mode)
  const inlinedScripts = await tryLoadInlinedScripts(pluginDir, logger);

  if (inlinedScripts) {
    logger?.debug('Using inlined scripts for execution');
    return executeFromInlinedScripts(scriptName, inlinedScripts, variables, args, timeout, logger);
  }

  // Fall back to file-based loading (local dev mode)
  logger?.debug('Using file-based scripts for execution');
  const scriptPath = await findScriptInPlugin(pluginDir, scriptName, logger);

  if (!scriptPath) {
    throw new Error(`Script not found: ${scriptName} in plugin ${pluginDir}`);
  }

  return loadAndExecuteScript(scriptPath, variables, args, timeout, logger);
}
