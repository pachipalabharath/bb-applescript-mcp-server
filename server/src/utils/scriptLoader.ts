/**
 * Script loader for managing AppleScript files
 * Supports both compiled scripts and template-based scripts
 */

import { dirname, join } from '@std/path';
import type { Logger } from 'jsr:@beyondbetter/bb-mcp-server';
import { renderTemplate } from './templateRenderer.ts';
import { compileAndRun, runAppleScript } from './scriptRunner.ts';
import type { AppleScriptResult } from './errorHandler.ts';

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
		logger?.error(`Failed to load script: ${scriptPath}`, { error });
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
		return runAppleScript({
			script: script.path,
			args,
			timeout,
			logger,
		});
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
		return runAppleScript({
			script: script.path,
			args,
			timeout,
			logger,
		});
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
 * Helper to find and execute a script from a plugin
 */
export async function findAndExecuteScript(
	pluginDir: string,
	scriptName: string,
	variables?: Record<string, any>,
	args?: string[],
	timeout?: number,
	logger?: Logger,
): Promise<AppleScriptResult> {
	const scriptPath = await findScriptInPlugin(pluginDir, scriptName, logger);

	if (!scriptPath) {
		throw new Error(`Script not found: ${scriptName} in plugin ${pluginDir}`);
	}

	return loadAndExecuteScript(scriptPath, variables, args, timeout, logger);
}
