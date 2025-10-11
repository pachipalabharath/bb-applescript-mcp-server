/**
 * Tests for scriptRunner.ts
 * Tests timeout validation and configuration parsing
 */

import { assertEquals } from '@std/assert';
import {
	getDefaultTimeout,
	getMaxTimeout,
	validateTimeout,
	getDebugConfig,
} from '../../src/utils/scriptRunner.ts';

Deno.test('getDefaultTimeout - uses environment variable', () => {
	// Save original value
	const original = Deno.env.get('APPLESCRIPT_TIMEOUT_DEFAULT');

	try {
		Deno.env.set('APPLESCRIPT_TIMEOUT_DEFAULT', '45000');
		const timeout = getDefaultTimeout();
		assertEquals(timeout, 45000);
	} finally {
		// Restore original
		if (original) {
			Deno.env.set('APPLESCRIPT_TIMEOUT_DEFAULT', original);
		} else {
			Deno.env.delete('APPLESCRIPT_TIMEOUT_DEFAULT');
		}
	}
});

Deno.test('getDefaultTimeout - returns default when not set', () => {
	// Save original value
	const original = Deno.env.get('APPLESCRIPT_TIMEOUT_DEFAULT');

	try {
		Deno.env.delete('APPLESCRIPT_TIMEOUT_DEFAULT');
		const timeout = getDefaultTimeout();
		assertEquals(timeout, 30000); // Default is 30 seconds
	} finally {
		// Restore original
		if (original) {
			Deno.env.set('APPLESCRIPT_TIMEOUT_DEFAULT', original);
		}
	}
});

Deno.test('getMaxTimeout - uses environment variable', () => {
	const original = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');

	try {
		Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', '600000');
		const timeout = getMaxTimeout();
		assertEquals(timeout, 600000);
	} finally {
		if (original) {
			Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', original);
		} else {
			Deno.env.delete('APPLESCRIPT_TIMEOUT_MAX');
		}
	}
});

Deno.test('getMaxTimeout - returns default when not set', () => {
	const original = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');

	try {
		Deno.env.delete('APPLESCRIPT_TIMEOUT_MAX');
		const timeout = getMaxTimeout();
		assertEquals(timeout, 300000); // Default is 5 minutes
	} finally {
		if (original) {
			Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', original);
		}
	}
});

Deno.test('validateTimeout - uses default when undefined', () => {
	const originalDefault = Deno.env.get('APPLESCRIPT_TIMEOUT_DEFAULT');
	const originalMax = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');

	try {
		Deno.env.delete('APPLESCRIPT_TIMEOUT_DEFAULT');
		Deno.env.delete('APPLESCRIPT_TIMEOUT_MAX');

		const timeout = validateTimeout(undefined);
		assertEquals(timeout, 30000); // Should use default
	} finally {
		if (originalDefault) Deno.env.set('APPLESCRIPT_TIMEOUT_DEFAULT', originalDefault);
		if (originalMax) Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', originalMax);
	}
});

Deno.test('validateTimeout - accepts value within limits', () => {
	const originalDefault = Deno.env.get('APPLESCRIPT_TIMEOUT_DEFAULT');
	const originalMax = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');

	try {
		Deno.env.delete('APPLESCRIPT_TIMEOUT_DEFAULT');
		Deno.env.delete('APPLESCRIPT_TIMEOUT_MAX');

		const timeout = validateTimeout(60000);
		assertEquals(timeout, 60000);
	} finally {
		if (originalDefault) Deno.env.set('APPLESCRIPT_TIMEOUT_DEFAULT', originalDefault);
		if (originalMax) Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', originalMax);
	}
});

Deno.test('validateTimeout - clamps to max when too large', () => {
	const originalDefault = Deno.env.get('APPLESCRIPT_TIMEOUT_DEFAULT');
	const originalMax = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');

	try {
		Deno.env.delete('APPLESCRIPT_TIMEOUT_DEFAULT');
		Deno.env.delete('APPLESCRIPT_TIMEOUT_MAX');

		const timeout = validateTimeout(999999999);
		assertEquals(timeout, 300000); // Should be clamped to max (5 min)
	} finally {
		if (originalDefault) Deno.env.set('APPLESCRIPT_TIMEOUT_DEFAULT', originalDefault);
		if (originalMax) Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', originalMax);
	}
});

Deno.test('validateTimeout - respects custom max', () => {
	const originalMax = Deno.env.get('APPLESCRIPT_TIMEOUT_MAX');

	try {
		Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', '120000');

		const timeout = validateTimeout(150000);
		assertEquals(timeout, 120000); // Should be clamped to custom max
	} finally {
		if (originalMax) {
			Deno.env.set('APPLESCRIPT_TIMEOUT_MAX', originalMax);
		} else {
			Deno.env.delete('APPLESCRIPT_TIMEOUT_MAX');
		}
	}
});

Deno.test('getDebugConfig - all defaults when not set', () => {
	const originalEnabled = Deno.env.get('DEBUG_APPLESCRIPT');
	const originalSaveAll = Deno.env.get('DEBUG_APPLESCRIPT_SAVE_ALL');
	const originalDir = Deno.env.get('DEBUG_APPLESCRIPT_DIR');
	const originalContext = Deno.env.get('DEBUG_APPLESCRIPT_CONTEXT');

	try {
		Deno.env.delete('DEBUG_APPLESCRIPT');
		Deno.env.delete('DEBUG_APPLESCRIPT_SAVE_ALL');
		Deno.env.delete('DEBUG_APPLESCRIPT_DIR');
		Deno.env.delete('DEBUG_APPLESCRIPT_CONTEXT');

		const config = getDebugConfig();
		assertEquals(config.enabled, false);
		assertEquals(config.saveAll, false);
		assertEquals(config.debugDir, './debug/applescript');
		assertEquals(config.contextLines, 5);
	} finally {
		if (originalEnabled) Deno.env.set('DEBUG_APPLESCRIPT', originalEnabled);
		if (originalSaveAll) Deno.env.set('DEBUG_APPLESCRIPT_SAVE_ALL', originalSaveAll);
		if (originalDir) Deno.env.set('DEBUG_APPLESCRIPT_DIR', originalDir);
		if (originalContext) Deno.env.set('DEBUG_APPLESCRIPT_CONTEXT', originalContext);
	}
});

Deno.test('getDebugConfig - respects environment variables', () => {
	const originalEnabled = Deno.env.get('DEBUG_APPLESCRIPT');
	const originalSaveAll = Deno.env.get('DEBUG_APPLESCRIPT_SAVE_ALL');
	const originalDir = Deno.env.get('DEBUG_APPLESCRIPT_DIR');
	const originalContext = Deno.env.get('DEBUG_APPLESCRIPT_CONTEXT');

	try {
		Deno.env.set('DEBUG_APPLESCRIPT', 'true');
		Deno.env.set('DEBUG_APPLESCRIPT_SAVE_ALL', 'true');
		Deno.env.set('DEBUG_APPLESCRIPT_DIR', './custom/debug');
		Deno.env.set('DEBUG_APPLESCRIPT_CONTEXT', '10');

		const config = getDebugConfig();
		assertEquals(config.enabled, true);
		assertEquals(config.saveAll, true);
		assertEquals(config.debugDir, './custom/debug');
		assertEquals(config.contextLines, 10);
	} finally {
		if (originalEnabled) {
			Deno.env.set('DEBUG_APPLESCRIPT', originalEnabled);
		} else {
			Deno.env.delete('DEBUG_APPLESCRIPT');
		}
		if (originalSaveAll) {
			Deno.env.set('DEBUG_APPLESCRIPT_SAVE_ALL', originalSaveAll);
		} else {
			Deno.env.delete('DEBUG_APPLESCRIPT_SAVE_ALL');
		}
		if (originalDir) {
			Deno.env.set('DEBUG_APPLESCRIPT_DIR', originalDir);
		} else {
			Deno.env.delete('DEBUG_APPLESCRIPT_DIR');
		}
		if (originalContext) {
			Deno.env.set('DEBUG_APPLESCRIPT_CONTEXT', originalContext);
		} else {
			Deno.env.delete('DEBUG_APPLESCRIPT_CONTEXT');
		}
	}
});

Deno.test('getDebugConfig - handles invalid context lines', () => {
	const originalContext = Deno.env.get('DEBUG_APPLESCRIPT_CONTEXT');

	try {
		Deno.env.set('DEBUG_APPLESCRIPT_CONTEXT', 'invalid');

		const config = getDebugConfig();
		// parseInt('invalid', 10) returns NaN
		assertEquals(isNaN(config.contextLines), true);
	} finally {
		if (originalContext) {
			Deno.env.set('DEBUG_APPLESCRIPT_CONTEXT', originalContext);
		} else {
			Deno.env.delete('DEBUG_APPLESCRIPT_CONTEXT');
		}
	}
});
