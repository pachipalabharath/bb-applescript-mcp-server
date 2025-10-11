/**
 * Tests for errorHandler.ts
 * Tests error parsing, type detection, and result creation
 */

import { assertEquals } from '@std/assert';
import {
	parseAppleScriptError,
	extractErrorMessage,
	generateErrorHint,
	createErrorResult,
	createSuccessResult,
} from '../../src/utils/errorHandler.ts';

Deno.test('parseAppleScriptError - permission error (not authorized)', () => {
	const stderr = 'Error: not authorized to send Apple events to BBEdit';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'permission');
});

Deno.test('parseAppleScriptError - permission error (not allowed)', () => {
	const stderr = 'Error: operation not allowed by system policy';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'permission');
});

Deno.test('parseAppleScriptError - permission error (permission denied)', () => {
	const stderr = 'Error: permission denied for application';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'permission');
});

Deno.test('parseAppleScriptError - timeout error', () => {
	const stderr = 'Error: operation timed out waiting for response';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'timeout');
});

Deno.test('parseAppleScriptError - syntax error', () => {
	const stderr = '23:15: syntax error: Expected end of line but found identifier';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'script_error');
});

Deno.test('parseAppleScriptError - execution error (can\'t get)', () => {
	const stderr = 'Error: Can\'t get window 1 of application "BBEdit"';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'script_error');
});

Deno.test('parseAppleScriptError - execution error (can\'t make)', () => {
	const stderr = 'Error: Can\'t make some data into expected type';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'script_error');
});

Deno.test('parseAppleScriptError - system error (generic)', () => {
	const stderr = 'Error: Unknown system failure occurred';
	const result = parseAppleScriptError(stderr);
	assertEquals(result, 'system_error');
});

Deno.test('extractErrorMessage - with line number format', () => {
	const stderr = '23:15: syntax error: Expected end of line';
	const result = extractErrorMessage(stderr);
	assertEquals(result, 'syntax error: Expected end of line');
});

Deno.test('extractErrorMessage - without line number', () => {
	const stderr = 'Error: Something went wrong';
	const result = extractErrorMessage(stderr);
	assertEquals(result, 'Error: Something went wrong');
});

Deno.test('extractErrorMessage - multiline error', () => {
	const stderr = 'Error: First line\nSecond line\nThird line';
	const result = extractErrorMessage(stderr);
	assertEquals(result, 'Error: First line');
});

Deno.test('extractErrorMessage - empty stderr', () => {
	const stderr = '';
	const result = extractErrorMessage(stderr);
	assertEquals(result, '');
});

Deno.test('generateErrorHint - permission error', () => {
	const hint = generateErrorHint('permission', 'not authorized');
	assertEquals(hint.includes('Automation permissions'), true);
	assertEquals(hint.includes('System Settings'), true);
});

Deno.test('generateErrorHint - timeout error', () => {
	const hint = generateErrorHint('timeout', 'timed out');
	assertEquals(hint.includes('timed out'), true);
	assertEquals(hint.includes('timeout parameter'), true);
});

Deno.test('generateErrorHint - syntax error', () => {
	const hint = generateErrorHint('script_error', 'syntax error');
	assertEquals(hint.includes('syntax error'), true);
	assertEquals(hint.includes('AppleScript syntax'), true);
});

Deno.test('generateErrorHint - can\'t get error', () => {
	const hint = generateErrorHint('script_error', 'can\'t get window');
	assertEquals(hint.includes('doesn\'t exist'), true);
});

Deno.test('generateErrorHint - disabled error', () => {
	const hint = generateErrorHint('disabled', 'tool disabled');
	assertEquals(hint.includes('disabled'), true);
	assertEquals(hint.includes('ENABLE_ARBITRARY_SCRIPTS'), true);
});

Deno.test('generateErrorHint - system error', () => {
	const hint = generateErrorHint('system_error', 'unknown error');
	assertEquals(hint.includes('system error'), true);
});

Deno.test('createErrorResult - basic error', () => {
	const result = createErrorResult(
		'script_error',
		'Syntax error on line 5',
		123.45,
		'/path/to/script.scpt',
		30000,
	);

	assertEquals(result.success, false);
	assertEquals(result.error?.type, 'script_error');
	assertEquals(result.error?.message, 'Syntax error on line 5');
	assertEquals(result.error?.hint !== undefined, true);
	assertEquals(result.metadata.executionTime, 123.45);
	assertEquals(result.metadata.scriptPath, '/path/to/script.scpt');
	assertEquals(result.metadata.timeoutUsed, 30000);
});

Deno.test('createErrorResult - with code and details', () => {
	const result = createErrorResult(
		'permission',
		'Not authorized',
		50,
		undefined,
		30000,
		'ERR_PERM',
		'Full error details here',
	);

	assertEquals(result.success, false);
	assertEquals(result.error?.type, 'permission');
	assertEquals(result.error?.code, 'ERR_PERM');
	assertEquals(result.error?.details, 'Full error details here');
});

Deno.test('createSuccessResult - string result', () => {
	const result = createSuccessResult(
		'Operation completed',
		250.5,
		'/path/to/script.scpt',
		30000,
	);

	assertEquals(result.success, true);
	assertEquals(result.result, 'Operation completed');
	assertEquals(result.error, undefined);
	assertEquals(result.metadata.executionTime, 250.5);
	assertEquals(result.metadata.scriptPath, '/path/to/script.scpt');
	assertEquals(result.metadata.timeoutUsed, 30000);
});

Deno.test('createSuccessResult - object result', () => {
	const resultData = { status: 'ok', count: 5 };
	const result = createSuccessResult(
		resultData,
		100,
	);

	assertEquals(result.success, true);
	assertEquals(result.result, resultData);
	assertEquals(result.metadata.executionTime, 100);
	assertEquals(result.metadata.scriptPath, undefined);
	assertEquals(result.metadata.timeoutUsed, 0);
});
