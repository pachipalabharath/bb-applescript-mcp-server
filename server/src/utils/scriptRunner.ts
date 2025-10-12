/**
 * Script runner for executing AppleScript code
 * Supports both compiled scripts (.scpt) and source scripts (.applescript)
 */

import { ensureDir } from 'jsr:@std/fs@^1.0.16';
import type { Logger } from '@beyondbetter/bb-mcp-server';
import { errorMessage, toError } from '@beyondbetter/bb-mcp-server';
import {
	AppleScriptResult,
	createErrorResult,
	createSuccessResult,
	extractErrorMessage,
	parseAppleScriptError,
} from './errorHandler.ts';

export interface ScriptRunOptions {
	/** Script file path or inline script code */
	script: string;
	/** Arguments to pass to the script */
	args?: string[];
	/** Timeout in milliseconds */
	timeout?: number;
	/** Whether this is inline code vs a file path */
	inline?: boolean;
	/** Logger instance */
	logger?: Logger;
}

export interface DebugConfig {
	/** Whether debug mode is enabled */
	enabled: boolean;
	/** Save all scripts, not just failures */
	saveAll: boolean;
	/** Directory for debug files */
	debugDir: string;
	/** Number of lines of context to show in errors */
	contextLines: number;
}

/**
 * Get debug configuration from environment variables
 */
export function getDebugConfig(): DebugConfig {
	return {
		enabled: Deno.env.get('DEBUG_APPLESCRIPT') === 'true',
		saveAll: Deno.env.get('DEBUG_APPLESCRIPT_SAVE_ALL') === 'true',
		debugDir: Deno.env.get('DEBUG_APPLESCRIPT_DIR') || './debug/applescript',
		contextLines: parseInt(Deno.env.get('DEBUG_APPLESCRIPT_CONTEXT') || '5', 10),
	};
}

/**
 * Save script to debug directory with metadata
 */
async function saveDebugScript(
	scriptContent: string,
	result: AppleScriptResult,
	config: DebugConfig,
	logger?: Logger,
): Promise<string | undefined> {
	if (!config.enabled) return undefined;

	// Only save if saveAll is true or if there was an error
	if (!config.saveAll && result.success) return undefined;

	try {
		// Ensure debug directory exists
		await ensureDir(config.debugDir);

		// Create filename with timestamp and status
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const status = result.success ? 'success' : 'failed';
		const scriptFile = `${config.debugDir}/${timestamp}_${status}.applescript`;
		const metaFile = `${config.debugDir}/${timestamp}_${status}.json`;

		// Save script content
		await Deno.writeTextFile(scriptFile, scriptContent);

		// Save metadata
		const metadata = {
			timestamp: new Date().toISOString(),
			status,
			result,
		};
		await Deno.writeTextFile(metaFile, JSON.stringify(metadata, null, 2));

		logger?.debug(`Saved debug script to ${scriptFile}`);
		return scriptFile;
	} catch (error) {
		logger?.warn('Failed to save debug script:', error);
		return undefined;
	}
}

/**
 * Extract context lines around an error line
 */
function getErrorContext(scriptContent: string, errorLine: number, contextLines: number): string {
	const lines = scriptContent.split('\n');
	const startLine = Math.max(0, errorLine - contextLines - 1);
	const endLine = Math.min(lines.length, errorLine + contextLines);

	const contextLineNumbers: string[] = [];
	for (let i = startLine; i < endLine; i++) {
		const lineNum = (i + 1).toString().padStart(4, ' ');
		const marker = i === errorLine - 1 ? ' >>>' : '    ';
		contextLineNumbers.push(`${marker} ${lineNum} | ${lines[i]}`);
	}

	return contextLineNumbers.join('\n');
}

/**
 * Gets the configured default timeout
 */
export function getDefaultTimeout(): number {
	const defaultStr = Deno.env.get('APPLESCRIPT_TIMEOUT_DEFAULT');
	return defaultStr ? parseInt(defaultStr, 10) : 30000;
}

/**
 * Gets the configured maximum timeout
 */
export function getMaxTimeout(): number {
	const maxStr = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');
	return maxStr ? parseInt(maxStr, 10) : 300000;
}

/**
 * Validates and clamps timeout to allowed range
 */
export function validateTimeout(timeout?: number): number {
	const defaultTimeout = getDefaultTimeout();
	const maxTimeout = getMaxTimeout();
	const requestedTimeout = timeout || defaultTimeout;
	return Math.min(requestedTimeout, maxTimeout);
}

/**
 * Executes an AppleScript using osascript
 */
export async function runAppleScript(options: ScriptRunOptions): Promise<AppleScriptResult> {
	const startTime = performance.now();
	const timeout = validateTimeout(options.timeout);

	try {
		// Build osascript command
		const args: string[] = [];

		if (options.inline) {
			// Execute inline code
			args.push('-e', options.script);
		} else {
			// Execute script file
			args.push(options.script);
		}

		// Add script arguments
		if (options.args && options.args.length > 0) {
			args.push(...options.args);
		}

		options.logger?.debug('Running AppleScript:', {
			script: options.inline ? 'inline' : options.script,
			args: options.args,
			timeout,
		});

		// Create abort controller for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			// Execute osascript
			const command = new Deno.Command('osascript', {
				args,
				stdout: 'piped',
				stderr: 'piped',
				signal: controller.signal,
			});

			const process = command.spawn();
			const { code, stdout, stderr } = await process.output();

			clearTimeout(timeoutId);

			const executionTime = performance.now() - startTime;
			const stdoutText = new TextDecoder().decode(stdout).trim();
			const stderrText = new TextDecoder().decode(stderr).trim();

			if (code === 0) {
				options.logger?.debug('AppleScript succeeded:', {
					output: stdoutText,
					executionTime,
				});

				return createSuccessResult(
					stdoutText,
					executionTime,
					options.inline ? undefined : options.script,
					timeout,
				);
			} else {
				// Script returned error
				const errorType = parseAppleScriptError(stderrText, code);
				const errorMessage = extractErrorMessage(stderrText);

				options.logger?.warn('AppleScript failed:', {
					code,
					errorType,
					message: errorMessage,
					stderr: stderrText,
				});

				return createErrorResult(
					errorType,
					errorMessage,
					executionTime,
					options.inline ? undefined : options.script,
					timeout,
					`ERR_SCRIPT_${code}`,
					stderrText,
				);
			}
		} catch (error) {
			clearTimeout(timeoutId);

			// Check if it was a timeout
			if (error instanceof Error && error.name === 'AbortError') {
				const executionTime = performance.now() - startTime;
				options.logger?.warn('AppleScript timed out:', {
					timeout,
					executionTime,
				});

				return createErrorResult(
					'timeout',
					`Script execution timed out after ${timeout}ms`,
					executionTime,
					options.inline ? undefined : options.script,
					timeout,
					'ERR_TIMEOUT',
				);
			}

			throw error;
		}
	} catch (error) {
		const executionTime = performance.now() - startTime;
		const message = error instanceof Error ? error.message : 'Unknown error';

		options.logger?.error('AppleScript system error:', toError(error), {
			message,
			errorDetails: errorMessage(error),
		});

		return createErrorResult(
			'system_error',
			message,
			executionTime,
			options.inline ? undefined : options.script,
			timeout,
			'ERR_SYSTEM',
			error instanceof Error ? error.stack : undefined,
		);
	}
}

/**
 * Compiles and runs an AppleScript source string
 * Useful for template-rendered scripts
 */
export async function compileAndRun(
	scriptSource: string,
	timeout?: number,
	logger?: Logger,
): Promise<AppleScriptResult> {
	const startTime = performance.now();
	const validatedTimeout = validateTimeout(timeout);
	const debugConfig = getDebugConfig();

	try {
		logger?.debug('Compiling and running AppleScript');

		// Create temporary file for script
		const tempFile = await Deno.makeTempFile({ suffix: '.applescript' });

		try {
			// Write script to temp file
			await Deno.writeTextFile(tempFile, scriptSource);

			// Compile the script
			const compileCommand = new Deno.Command('osacompile', {
				args: ['-o', tempFile + '.scpt', tempFile],
				stdout: 'piped',
				stderr: 'piped',
			});

			const compileProcess = compileCommand.spawn();
			const { code: compileCode, stderr: compileStderr } = await compileProcess.output();

			if (compileCode !== 0) {
				const stderrText = new TextDecoder().decode(compileStderr).trim();
				const executionTime = performance.now() - startTime;

				// Extract error line number if available
				const lineMatch = stderrText.match(/:([0-9]+):/);
				const errorLine = lineMatch?.[1] ? parseInt(lineMatch[1], 10) : undefined;

				// Build enhanced error message with context
				let errorMessage = `Compilation failed: ${extractErrorMessage(stderrText)}`;
				let errorDetails = stderrText;

				// Add line context if we have a line number
				if (errorLine && debugConfig.contextLines > 0) {
					const context = getErrorContext(scriptSource, errorLine, debugConfig.contextLines);
					errorDetails = `${stderrText}\n\nScript context:\n${context}`;
				}

				logger?.warn('AppleScript compilation failed:', {
					code: compileCode,
					stderr: stderrText,
					line: errorLine,
				});

				const result = createErrorResult(
					'script_error',
					errorMessage,
					executionTime,
					undefined,
					validatedTimeout,
					'ERR_COMPILE',
					errorDetails,
				);

				// Save debug script
				const debugFile = await saveDebugScript(scriptSource, result, debugConfig, logger);
				if (debugFile) {
					// Add debug file path to error details
					if (result.error) {
						result.error.details = `${result.error.details}\n\nDebug script saved to: ${debugFile}`;
					}
				}

				return result;
			}

			// Run the compiled script
			const runOptions: ScriptRunOptions = {
				script: tempFile + '.scpt',
				timeout: validatedTimeout,
			};
			if (logger !== undefined) runOptions.logger = logger;
			const result = await runAppleScript(runOptions);

			// Save debug script for successful runs if configured
			const debugFile = await saveDebugScript(scriptSource, result, debugConfig, logger);
			if (debugFile && !result.success && result.error) {
				// Add debug file path to error details for runtime errors
				result.error.details = `${result.error.details || ''}\n\nDebug script saved to: ${debugFile}`;
			}

			return result;
		} finally {
			// Cleanup temp files
			try {
				await Deno.remove(tempFile);
				await Deno.remove(tempFile + '.scpt');
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		const executionTime = performance.now() - startTime;
		const message = error instanceof Error ? error.message : 'Unknown error';

		logger?.error('AppleScript compile/run error:', toError(error), {
			message,
			errorDetails: errorMessage(error),
		});

		return createErrorResult(
			'system_error',
			message,
			executionTime,
			undefined,
			validatedTimeout,
			'ERR_SYSTEM',
			error instanceof Error ? error.stack : undefined,
		);
	}
}
