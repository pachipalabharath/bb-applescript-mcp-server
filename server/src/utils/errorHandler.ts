/**
 * Standardized error handling for AppleScript execution
 */

import type { Logger } from '@beyondbetter/bb-mcp-server';
import { toError } from '@beyondbetter/bb-mcp-server';

export type ErrorType = 'permission' | 'timeout' | 'script_error' | 'system_error' | 'disabled';

export interface AppleScriptError {
	type: ErrorType;
	message: string;
	code?: string;
	hint?: string;
	details?: string;
}

export interface AppleScriptResult {
	success: boolean;
	result?: string | object;
	error?: AppleScriptError;
	metadata: {
		executionTime: number;
		scriptPath?: string;
		timeoutUsed: number;
	};
}

/**
 * Parse AppleScript error output to determine error type
 */
export function parseAppleScriptError(stderr: string, code?: number): ErrorType {
	const stderrLower = stderr.toLowerCase();

	// Check for permission errors
	if (
		stderrLower.includes('not authorized') ||
		stderrLower.includes('not allowed') ||
		stderrLower.includes('permission denied') ||
		stderrLower.includes('operation not permitted')
	) {
		return 'permission';
	}

	// Check for timeout errors
	if (stderrLower.includes('timeout') || stderrLower.includes('timed out')) {
		return 'timeout';
	}

	// Check for script syntax/runtime errors
	if (
		stderrLower.includes('syntax error') ||
		stderrLower.includes('execution error') ||
		stderrLower.includes('expected') ||
		stderrLower.includes("can't get") ||
		stderrLower.includes("can't make")
	) {
		return 'script_error';
	}

	// Default to system error
	return 'system_error';
}

/**
 * Extract a clean error message from AppleScript error output
 */
export function extractErrorMessage(stderr: string): string {
	// AppleScript errors often have format: "line:col: message"
	const match = stderr.match(/\d+:\d+:\s*(.+)/);
	if (match?.[1]) {
		return match[1].trim();
	}

	// Otherwise, take first non-empty line
	const lines = stderr.split('\n').filter((line) => line.trim().length > 0);
	return lines[0] || stderr;
}

/**
 * Generate a hint for the LLM based on error type
 */
export function generateErrorHint(errorType: ErrorType, message: string): string {
	switch (errorType) {
		case 'permission':
			return 'This operation requires Automation permissions. Ask the user to grant permissions in System Settings > Privacy & Security > Automation. You can use the check_applescript_permissions tool to verify.';

		case 'timeout':
			return 'The script execution timed out. Consider increasing the timeout parameter or optimizing the script.';

		case 'script_error':
			if (message.toLowerCase().includes('syntax error')) {
				return 'There is a syntax error in the AppleScript. Check the script for proper AppleScript syntax.';
			}
			if (message.toLowerCase().includes("can't get") || message.toLowerCase().includes("can't make")) {
				return "The script tried to access something that doesn't exist. Verify the object/property exists before accessing it.";
			}
			return 'The script encountered an execution error. Review the error message and check the script logic.';

		case 'disabled':
			return 'This tool is disabled for safety. To enable it, set ENABLE_ARBITRARY_SCRIPTS=true in the environment configuration.';

		case 'system_error':
			return 'A system error occurred. Check that the target application is installed and running (if required).';

		default:
			return 'An unexpected error occurred. Review the error details for more information.';
	}
}

/**
 * Create a standardized error result
 */
export function createErrorResult(
	errorType: ErrorType,
	message: string,
	executionTime: number,
	scriptPath?: string,
	timeoutUsed?: number,
	code?: string,
	details?: string,
): AppleScriptResult {
	const errorObj: AppleScriptError = {
		type: errorType,
		message,
		hint: generateErrorHint(errorType, message),
	};
	if (code !== undefined) errorObj.code = code;
	if (details !== undefined) errorObj.details = details;

	const metadata: AppleScriptResult['metadata'] = {
		executionTime,
		timeoutUsed: timeoutUsed || 0,
	};
	if (scriptPath !== undefined) metadata.scriptPath = scriptPath;

	return {
		success: false,
		error: errorObj,
		metadata,
	};
}

/**
 * Create a standardized success result
 */
export function createSuccessResult(
	result: string | object,
	executionTime: number,
	scriptPath?: string,
	timeoutUsed?: number,
): AppleScriptResult {
	const metadata: AppleScriptResult['metadata'] = {
		executionTime,
		timeoutUsed: timeoutUsed || 0,
	};
	if (scriptPath !== undefined) metadata.scriptPath = scriptPath;

	return {
		success: true,
		result,
		metadata,
	};
}

/**
 * Log error with context
 */
export function logError(logger: Logger, error: AppleScriptError, context: string): void {
	logger.error(`AppleScript error in ${context}:`, toError(error), {
		type: error.type,
		message: error.message,
		code: error.code,
		details: error.details,
	});
}
