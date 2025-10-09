/**
 * Utilities for parsing Apple sdef (scripting definition) XML
 */

import { DOMParser, XMLSerializer } from 'npm:@xmldom/xmldom';

/**
 * Helper to get direct child elements with a specific tag name
 */
function getDirectChildren(parent: Element, tagName: string): Element[] {
	const result: Element[] = [];
	for (let i = 0; i < parent.childNodes.length; i++) {
		const child = parent.childNodes[i];
		if (child.nodeType === 1) { // Element node
			const element = child as Element;
			if (element.tagName === tagName) {
				result.push(element);
			}
		}
	}
	return result;
}

/**
 * Helper to convert NodeList to Array of Elements
 */
function nodeListToArray(nodeList: any): Element[] {
	const result: Element[] = [];
	for (let i = 0; i < nodeList.length; i++) {
		result.push(nodeList[i] as Element);
	}
	return result;
}

/**
 * Parse sdef XML and return a structured overview
 */
export function parseSdefOverview(sdefXml: string, applicationName: string): any {
	const parser = new DOMParser();
	const doc = parser.parseFromString(sdefXml, 'text/xml');

	if (!doc) {
		throw new Error('Failed to parse XML');
	}

	// Check for parse errors
	const parseErrors = doc.getElementsByTagName('parsererror');
	if (parseErrors.length > 0) {
		throw new Error(`XML parse error: ${parseErrors[0].textContent}`);
	}

	const overview: any = {
		application: applicationName,
		suites: [],
	};

	// Parse each suite
	const suites = nodeListToArray(doc.getElementsByTagName('suite'));
	suites.forEach((suite) => {
		const suiteName = suite.getAttribute('name') || 'Unknown';
		const suiteDescription = suite.getAttribute('description') || '';

		const suiteData: any = {
			name: suiteName,
			description: suiteDescription,
			classes: [],
			commands: [],
			enumerations: [],
			events: [],
		};

		// Parse classes
		const classes = getDirectChildren(suite, 'class');
		classes.forEach((cls) => {
			const name = cls.getAttribute('name') || '';
			const description = cls.getAttribute('description') || '';
			const inherits = cls.getAttribute('inherits') || undefined;
			const properties = getDirectChildren(cls, 'property');
			const elements = getDirectChildren(cls, 'element');

			suiteData.classes.push({
				name,
				description,
				inherits,
				properties_count: properties.length,
				elements_count: elements.length,
			});
		});

		// Parse commands
		const commands = getDirectChildren(suite, 'command');
		commands.forEach((cmd) => {
			const name = cmd.getAttribute('name') || '';
			const description = cmd.getAttribute('description') || '';
			const directParameters = getDirectChildren(cmd, 'direct-parameter');
			const directParameter = directParameters.length > 0 ? directParameters[0] : null;
			const parameters = getDirectChildren(cmd, 'parameter');

			suiteData.commands.push({
				name,
				description,
				has_direct_parameter: !!directParameter,
				parameters_count: parameters.length,
			});
		});

		// Parse enumerations
		const enumerations = getDirectChildren(suite, 'enumeration');
		enumerations.forEach((enumEl) => {
			const name = enumEl.getAttribute('name') || '';
			const description = enumEl.getAttribute('description') || '';
			const enumerators = getDirectChildren(enumEl, 'enumerator');
			const values = enumerators.map((e) => e.getAttribute('name') || '');

			suiteData.enumerations.push({
				name,
				description,
				values,
			});
		});

		// Parse events (less common but included for completeness)
		const events = getDirectChildren(suite, 'event');
		events.forEach((evt) => {
			const name = evt.getAttribute('name') || '';
			const description = evt.getAttribute('description') || '';

			suiteData.events.push({
				name,
				description,
			});
		});

		overview.suites.push(suiteData);
	});

	return overview;
}

/**
 * Parse sdef XML and return complete detailed structure (for full mode)
 */
export function parseSdefFull(sdefXml: string, applicationName: string): any {
	const parser = new DOMParser();
	const doc = parser.parseFromString(sdefXml, 'text/xml');

	if (!doc) {
		throw new Error('Failed to parse XML');
	}

	// Check for parse errors
	const parseErrors = doc.getElementsByTagName('parsererror');
	if (parseErrors.length > 0) {
		throw new Error(`XML parse error: ${parseErrors[0].textContent}`);
	}

	const fullData: any = {
		application: applicationName,
		suites: [],
	};

	// Parse each suite with full details
	const suites = nodeListToArray(doc.getElementsByTagName('suite'));
	suites.forEach((suite) => {
		const suiteName = suite.getAttribute('name') || 'Unknown';
		const suiteDescription = suite.getAttribute('description') || '';

		const suiteData: any = {
			name: suiteName,
			description: suiteDescription,
			classes: [],
			commands: [],
			enumerations: [],
			events: [],
		};

		// Parse classes with full details
		const classes = getDirectChildren(suite, 'class');
		classes.forEach((cls) => {
			const classData: any = {
				name: cls.getAttribute('name') || '',
				code: cls.getAttribute('code') || '',
				description: cls.getAttribute('description') || '',
				inherits: cls.getAttribute('inherits') || undefined,
				plural: cls.getAttribute('plural') || undefined,
				properties: [],
				elements: [],
			};

			const properties = getDirectChildren(cls, 'property');
			classData.properties = properties.map((prop) => ({
				name: prop.getAttribute('name'),
				code: prop.getAttribute('code'),
				type: prop.getAttribute('type'),
				description: prop.getAttribute('description'),
				access: prop.getAttribute('access') || 'read-write',
			}));

			const elements = getDirectChildren(cls, 'element');
			classData.elements = elements.map((elem) => ({
				type: elem.getAttribute('type'),
				access: elem.getAttribute('access'),
			}));

			suiteData.classes.push(classData);
		});

		// Parse commands with full details
		const commands = getDirectChildren(suite, 'command');
		commands.forEach((cmd) => {
			const commandData: any = {
				name: cmd.getAttribute('name') || '',
				code: cmd.getAttribute('code') || '',
				description: cmd.getAttribute('description') || '',
				parameters: [],
			};

			const directParameters = getDirectChildren(cmd, 'direct-parameter');
			if (directParameters.length > 0) {
				commandData.direct_parameter = {
					type: directParameters[0].getAttribute('type'),
					description: directParameters[0].getAttribute('description'),
					optional: directParameters[0].getAttribute('optional') === 'yes',
				};
			}

			const parameters = getDirectChildren(cmd, 'parameter');
			commandData.parameters = parameters.map((param) => ({
				name: param.getAttribute('name'),
				code: param.getAttribute('code'),
				type: param.getAttribute('type'),
				description: param.getAttribute('description'),
				optional: param.getAttribute('optional') === 'yes',
			}));

			const results = getDirectChildren(cmd, 'result');
			if (results.length > 0) {
				commandData.result = {
					type: results[0].getAttribute('type'),
					description: results[0].getAttribute('description'),
				};
			}

			suiteData.commands.push(commandData);
		});

		// Parse enumerations with full details
		const enumerations = getDirectChildren(suite, 'enumeration');
		enumerations.forEach((enumEl) => {
			const enumData: any = {
				name: enumEl.getAttribute('name') || '',
				code: enumEl.getAttribute('code') || '',
				description: enumEl.getAttribute('description') || '',
				enumerators: [],
			};

			const enumerators = getDirectChildren(enumEl, 'enumerator');
			enumData.enumerators = enumerators.map((e) => ({
				name: e.getAttribute('name'),
				code: e.getAttribute('code'),
				description: e.getAttribute('description'),
			}));

			suiteData.enumerations.push(enumData);
		});

		// Parse events with full details
		const events = getDirectChildren(suite, 'event');
		events.forEach((evt) => {
			const eventData: any = {
				name: evt.getAttribute('name') || '',
				code: evt.getAttribute('code') || '',
				description: evt.getAttribute('description') || '',
			};

			suiteData.events.push(eventData);
		});

		fullData.suites.push(suiteData);
	});

	return fullData;
}

/**
 * Extract raw XML snippets for queried items
 */
export function extractSdefQueryXml(sdefXml: string, queries: string[]): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(sdefXml, 'text/xml');

	if (!doc) {
		throw new Error('Failed to parse XML');
	}

	// Check for parse errors
	const parseErrors = doc.getElementsByTagName('parsererror');
	if (parseErrors.length > 0) {
		throw new Error(`XML parse error: ${parseErrors[0].textContent}`);
	}

	const serializer = new XMLSerializer();
	const xmlParts: string[] = [];

	// Process each query
	queries.forEach((query) => {
		const [type, name] = query.split(':');
		if (!type || !name) {
			xmlParts.push(`<!-- Invalid query format: ${query} -->`);
			return;
		}

		// Find elements by tag name and filter by name attribute
		const allElements = nodeListToArray(doc.getElementsByTagName(type));
		const elements = allElements.filter((el) => el.getAttribute('name') === name);

		if (elements.length === 0) {
			xmlParts.push(`<!-- Not found: ${query} -->`);
			return;
		}

		// Serialize each matching element
		elements.forEach((element) => {
			xmlParts.push(`<!-- Query: ${query} -->`);
			const xmlString = serializer.serializeToString(element);
			// Normalize indentation by removing leading whitespace from each line
			const normalized = xmlString.split('\n').map((line) => line.replace(/^\s+/, '')).join('\n');
			xmlParts.push(normalized);
			xmlParts.push('');
		});
	});

	return xmlParts.join('\n');
}

/**
 * Parse sdef XML and return specific queried items
 */
export function parseSdefQuery(sdefXml: string, queries: string[], applicationName: string): any {
	const parser = new DOMParser();
	const doc = parser.parseFromString(sdefXml, 'text/xml');

	if (!doc) {
		throw new Error('Failed to parse XML');
	}

	// Check for parse errors
	const parseErrors = doc.getElementsByTagName('parsererror');
	if (parseErrors.length > 0) {
		throw new Error(`XML parse error: ${parseErrors[0].textContent}`);
	}

	const result: any = {
		application: applicationName,
		items: [],
	};

	// Process each query
	queries.forEach((query) => {
		const [type, name] = query.split(':');
		if (!type || !name) {
			result.items.push({
				query,
				error: 'Invalid query format. Use "type:name" (e.g., "class:document")',
			});
			return;
		}

		// Find elements by tag name and filter by name attribute
		const allElements = nodeListToArray(doc.getElementsByTagName(type));
		const elements = allElements.filter((el) => el.getAttribute('name') === name);

		if (elements.length === 0) {
			result.items.push({
				query,
				type,
				name,
				error: 'Not found',
			});
			return;
		}

		// Process each matching element
		elements.forEach((element) => {
			const itemData: any = {
				query,
				type,
				name,
			};

			// Extract all attributes
			const attributes: any = {};
			for (const attr of Array.from(element.attributes)) {
				attributes[attr.name] = attr.value;
			}
			itemData.attributes = attributes;

			// Extract child elements based on type
			if (type === 'class') {
				const properties = getDirectChildren(element, 'property');
				itemData.properties = properties.map((prop) => ({
					name: prop.getAttribute('name'),
					type: prop.getAttribute('type'),
					description: prop.getAttribute('description'),
					access: prop.getAttribute('access') || 'read-write',
				}));

				const elements = getDirectChildren(element, 'element');
				itemData.elements = elements.map((elem) => ({
					type: elem.getAttribute('type'),
					access: elem.getAttribute('access'),
				}));
			} else if (type === 'command') {
				const directParams = getDirectChildren(element, 'direct-parameter');
				if (directParams.length > 0) {
					itemData.direct_parameter = {
						type: directParams[0].getAttribute('type'),
						description: directParams[0].getAttribute('description'),
					};
				}

				const parameters = getDirectChildren(element, 'parameter');
				itemData.parameters = parameters.map((param) => ({
					name: param.getAttribute('name'),
					type: param.getAttribute('type'),
					description: param.getAttribute('description'),
					optional: param.getAttribute('optional') === 'yes',
				}));

				const results = getDirectChildren(element, 'result');
				if (results.length > 0) {
					itemData.result = {
						type: results[0].getAttribute('type'),
						description: results[0].getAttribute('description'),
					};
				}
			} else if (type === 'enumeration') {
				const enumerators = getDirectChildren(element, 'enumerator');
				itemData.enumerators = enumerators.map((e) => ({
					name: e.getAttribute('name'),
					code: e.getAttribute('code'),
					description: e.getAttribute('description'),
				}));
			}

			result.items.push(itemData);
		});
	});

	return result;
}
