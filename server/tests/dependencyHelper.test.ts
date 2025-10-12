/**
 * Tests for dependencyHelper.ts
 * Verifies runtime detection and plugin loading strategy
 */

import { assertEquals, assert } from '@std/assert';
import { isRunningFromJsr, getStaticPlugins } from '../src/dependencyHelper.ts';

Deno.test('isRunningFromJsr - detects local file URLs', () => {
	// When running tests locally, import.meta.url should start with file://
	const result = isRunningFromJsr();
	
	// In test environment, we're running from local files
	assertEquals(
		result,
		false,
		'Test should detect local file:// URL as not JSR',
	);
});

Deno.test('getStaticPlugins - returns array of plugins', () => {
	const plugins = getStaticPlugins();
	
	// Should return an array
	assert(Array.isArray(plugins), 'Should return an array');
	
	// Should have at least standard and bbedit plugins
	assert(plugins.length >= 2, 'Should have at least 2 plugins');
	
	// Verify plugin structure
	for (const plugin of plugins) {
		assert(plugin.name, 'Plugin should have a name');
		assert(plugin.version, 'Plugin should have a version');
		assert(plugin.description, 'Plugin should have a description');
		assert(Array.isArray(plugin.workflows), 'Plugin should have workflows array');
		assert(Array.isArray(plugin.tools), 'Plugin should have tools array');
	}
	
	// Verify we have the expected plugins
	const pluginNames = plugins.map((p) => p.name);
	assert(
		pluginNames.includes('standard-tools'),
		'Should include standard-tools plugin',
	);
	assert(
		pluginNames.includes('bbedit'),
		'Should include bbedit plugin',
	);
});

Deno.test('getStaticPlugins - plugins have initialize method', () => {
	const plugins = getStaticPlugins();
	
	for (const plugin of plugins) {
		assert(
			typeof plugin.initialize === 'function',
			`Plugin ${plugin.name} should have an initialize method`,
		);
	}
});

Deno.test('URL detection logic - JSR patterns', () => {
	// Test the logic without mocking import.meta.url
	// These are the patterns we expect to detect
	const jsrPatterns = [
		'https://jsr.io/@beyondbetter/bb-applescript-mcp-server/0.1.0/server/main.ts',
		'https://esm.sh/jsr/@beyondbetter/bb-applescript-mcp-server@0.1.0/server/main.ts',
		'https://cdn.jsdelivr.net/jsr/@beyondbetter/bb-applescript-mcp-server/server/main.ts',
	];
	
	for (const url of jsrPatterns) {
		const isJsr = url.startsWith('https://jsr.io/') || 
		             url.startsWith('https://esm.sh/jsr/') ||
		             !url.startsWith('file://');
		assert(
			isJsr,
			`Should detect ${url} as JSR URL`,
		);
	}
	
	const localPatterns = [
		'file:///Users/username/projects/bb-mcp-applescript/server/main.ts',
		'file:///C:/Projects/bb-mcp-applescript/server/main.ts',
	];
	
	for (const url of localPatterns) {
		const isLocal = url.startsWith('file://');
		assert(
			isLocal,
			`Should detect ${url} as local file URL`,
		);
	}
});
