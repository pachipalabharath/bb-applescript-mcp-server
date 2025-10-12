/**
 * Template renderer for AppleScript with proper escaping
 * Provides a tagged template literal function for safe string interpolation
 */

/**
 * Escapes a string value for use in AppleScript
 * Handles quotes, backslashes, and special characters
 */
export function escapeAppleScriptString(value: string): string {
	// Escape backslashes first (must be done before quotes)
	let escaped = value.replace(/\\/g, '\\\\');
	// Escape double quotes
	escaped = escaped.replace(/"/g, '\\"');
	// Wrap in quotes
	return `"${escaped}"`;
}

/**
 * Converts a JavaScript array to an AppleScript list
 * Example: ["a", "b", "c"] => {"a", "b", "c"}
 */
export function toAppleScriptList(arr: any[]): string {
	const escaped = arr.map((item) => {
		if (typeof item === 'string') {
			return escapeAppleScriptString(item);
		} else if (typeof item === 'number' || typeof item === 'boolean') {
			return String(item);
		} else if (item === null || item === undefined) {
			return 'missing value';
		} else if (Array.isArray(item)) {
			return toAppleScriptList(item);
		} else {
			// For objects, convert to string and escape
			return escapeAppleScriptString(JSON.stringify(item));
		}
	});
	return `{${escaped.join(', ')}}`;
}

/**
 * Converts a JavaScript object to an AppleScript record
 * Example: {name: "test", value: 42} => {name:"test", value:42}
 */
export function toAppleScriptRecord(obj: Record<string, any>): string {
	const pairs = Object.entries(obj).map(([key, value]) => {
		let valueStr: string;
		if (typeof value === 'string') {
			valueStr = escapeAppleScriptString(value);
		} else if (typeof value === 'number' || typeof value === 'boolean') {
			valueStr = String(value);
		} else if (value === null || value === undefined) {
			valueStr = 'missing value';
		} else if (Array.isArray(value)) {
			valueStr = toAppleScriptList(value);
		} else if (typeof value === 'object') {
			valueStr = toAppleScriptRecord(value);
		} else {
			valueStr = escapeAppleScriptString(String(value));
		}
		return `${key}:${valueStr}`;
	});
	return `{${pairs.join(', ')}}`;
}

/**
 * Tagged template literal function for AppleScript
 * Automatically escapes interpolated values and converts arrays/objects
 *
 * Usage:
 * const name = "My Notebook";
 * const items = ["file1.txt", "file2.txt"];
 * const code = script`
 *   tell application "BBEdit"
 *     make new notebook with properties {name:${name}}
 *     repeat with itemPath in ${items}
 *       open itemPath
 *     end repeat
 *   end tell
 * `;
 */
export function script(strings: TemplateStringsArray, ...values: any[]): string {
	return strings.reduce((result, str, i) => {
		const value = values[i];
		if (value === undefined) return result + str;

		// Handle different types
		if (Array.isArray(value)) {
			return result + str + toAppleScriptList(value);
		} else if (typeof value === 'object' && value !== null) {
			return result + str + toAppleScriptRecord(value);
		} else if (typeof value === 'string') {
			return result + str + escapeAppleScriptString(value);
		} else if (typeof value === 'number' || typeof value === 'boolean') {
			return result + str + String(value);
		} else if (value === null || value === undefined) {
			return result + str + 'missing value';
		} else {
			// Fallback: convert to string and escape
			return result + str + escapeAppleScriptString(String(value));
		}
	}, '');
}

/**
 * Renders a template string with variables
 * Alternative to tagged template literals for dynamic template loading
 *
 * @param template - Template string with ${variable} markers
 * @param variables - Object with variable values
 * @returns Rendered AppleScript code
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
	return template.replace(/\$\{([^}]+)\}/g, (match, varName) => {
		const value = variables[varName.trim()];
		if (value === undefined) {
			throw new Error(`Template variable '${varName}' is not defined`);
		}

		// Handle different types
		if (Array.isArray(value)) {
			return toAppleScriptList(value);
		} else if (typeof value === 'object' && value !== null) {
			return toAppleScriptRecord(value);
		} else if (typeof value === 'string') {
			return escapeAppleScriptString(value);
		} else if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		} else if (value === null) {
			return 'missing value';
		} else {
			return escapeAppleScriptString(String(value));
		}
	});
}
