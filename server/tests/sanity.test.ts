/**
 * Sanity check test
 * Verifies that the test framework is working correctly
 */

import { assertEquals, assert } from '@std/assert';

Deno.test('sanity check - basic assertion', () => {
	assertEquals(1 + 1, 2);
});

Deno.test('sanity check - boolean assertion', () => {
	assert(true);
});

Deno.test('sanity check - string comparison', () => {
	const greeting = 'Hello, World!';
	assertEquals(greeting, 'Hello, World!');
});

Deno.test('sanity check - array comparison', () => {
	const arr = [1, 2, 3];
	assertEquals(arr.length, 3);
	assertEquals(arr[0], 1);
});

Deno.test('sanity check - object comparison', () => {
	const obj = { name: 'test', value: 42 };
	assertEquals(obj.name, 'test');
	assertEquals(obj.value, 42);
});
