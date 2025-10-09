/**
 * Script runner for executing AppleScript code
 * Supports both compiled scripts (.scpt) and source scripts (.applescript)
 */

import type { Logger } from 'jsr:@beyondbetter/bb-mcp-server';
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

		options.logger?.error('AppleScript system error:', {
			message,
			error,
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

				logger?.warn('AppleScript compilation failed:', {
					code: compileCode,
					stderr: stderrText,
				});

				return createErrorResult(
					'script_error',
					`Compilation failed: ${extractErrorMessage(stderrText)}`,
					executionTime,
					undefined,
					validatedTimeout,
					'ERR_COMPILE',
					stderrText,
				);
			}

			// Run the compiled script
			const result = await runAppleScript({
				script: tempFile + '.scpt',
				timeout: validatedTimeout,
				logger,
			});

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

		logger?.error('AppleScript compile/run error:', {
			message,
			error,
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
