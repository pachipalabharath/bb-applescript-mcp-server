/**
 * Read AppleScript Dictionary Tool
 *
 * Reads and parses AppleScript dictionaries for applications.
 * Supports multiple output modes and formats.
 */

import { z } from 'zod';
import { runAppleScript } from '../../../utils/scriptRunner.ts';
import { createErrorResult } from '../../../utils/errorHandler.ts';
import { extractSdefQueryXml, parseSdefFull, parseSdefOverview, parseSdefQuery } from '../../../utils/sdefParser.ts';
import type { ToolConfig, ToolDependencies } from '../../../types/toolTypes.ts';

// Define input schema for type inference
const readDictionaryInputSchema = {
	application: z.string().describe('Name of the application (e.g., "BBEdit", "Finder")'),
	mode: z
		.enum(['overview', 'query', 'full'])
		.default('overview')
		.describe(
			'Output mode: overview (structured summary), query (specific items), full (complete dictionary)',
		),
	outputFormat: z
		.enum(['json', 'xml'])
		.default('json')
		.describe(
			'Output format: json (structured data) or xml (raw sdef XML). JSON is recommended for LLM consumption.',
		),
	query: z
		.array(z.string())
		.optional()
		.describe(
			'Query for specific items (mode=query only). Format: "type:name" (e.g., ["class:document", "command:open"])',
		),
	timeout: z.number().optional().describe('Timeout in milliseconds'),
} as const;

// Infer the type from the schema
type ReadDictionaryArgs = {
	application: string;
	mode?: 'overview' | 'query' | 'full';
	outputFormat?: 'json' | 'xml';
	query?: string[];
	timeout?: number;
};

export function getTools(dependencies: ToolDependencies): ToolConfig<any>[] {
	const { logger } = dependencies;

	return [
		{
			name: 'read_dictionary',
			definition: {
				title: 'Read AppleScript Dictionary',
				description:
					'Read the AppleScript dictionary for an application. Returns available classes, commands, properties, and events. Use this to understand what AppleScript operations are available for an application.',
				category: 'AppleScript',
				inputSchema: readDictionaryInputSchema,
			},
			handler: async (args: ReadDictionaryArgs) => {
				try {
					logger.info(`Reading dictionary for ${args.application}`);

					const timeoutMs = args.timeout ?? 30000;

					// First, resolve the application name to its full path using AppleScript
					// sdef requires the full path, not just the app name
					const resolveScript = `POSIX path of (path to application "${args.application}")`;
					const resolveResult = await runAppleScript({
						script: resolveScript,
						inline: true,
						timeout: timeoutMs,
						logger,
					});

					if (!resolveResult.success) {
						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(resolveResult, null, 2),
								},
							],
							isError: true,
						};
					}

					const appPath = resolveResult.result as string;
					logger.debug(`Resolved ${args.application} to ${appPath}`);

					// Now call sdef with the resolved path
					// Create abort controller for timeout
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

					try {
						const command = new Deno.Command('sdef', {
							args: [appPath],
							stdout: 'piped',
							stderr: 'piped',
							signal: controller.signal,
						});

						const process = command.spawn();
						const { code, stdout, stderr } = await process.output();
						clearTimeout(timeoutId);

						if (code !== 0) {
							const errorMsg = new TextDecoder('utf-8').decode(stderr);
							const result = createErrorResult(
								'execution',
								`Failed to read dictionary for ${args.application}: ${errorMsg}`,
								code,
								errorMsg,
								0,
								'ERR_SDEF_FAILED',
							);
							return {
								content: [
									{
										type: 'text',
										text: JSON.stringify(result, null, 2),
									},
								],
								isError: true,
							};
						}

						// Extract encoding from XML declaration
						// Use latin1 for initial read as it's single-byte and won't corrupt data
						const latinOutput = new TextDecoder('latin1').decode(stdout);
						const encodingMatch = latinOutput.match(/<\?xml[^>]*encoding="([^"]+)"/i);
						const encoding = encodingMatch ? encodingMatch[1] : 'macintosh';

						// Decode with detected encoding (sdef typically uses Mac Roman/macintosh)
						const sdefOutput = new TextDecoder(encoding).decode(stdout);

						if (!sdefOutput || sdefOutput.trim() === '') {
							const result = createErrorResult(
								'execution',
								`Unable to read dictionary for ${args.application}`,
								0,
								'No output from sdef',
								0,
								'ERR_SDEF_EMPTY',
							);
							return {
								content: [
									{
										type: 'text',
										text: JSON.stringify(result, null, 2),
									},
								],
								isError: true,
							};
						}

						// Handle output mode
						const mode = args.mode || 'overview';
						const outputFormat = args.outputFormat || 'json';
						let responseText: string;

						if (mode === 'full') {
							// Return complete dictionary
							if (outputFormat === 'xml') {
								responseText = sdefOutput;
							} else {
								// Parse full XML to JSON with complete details
								try {
									const fullData = parseSdefFull(sdefOutput, args.application);
									responseText = JSON.stringify(fullData, null, 2);
								} catch (parseError) {
									logger.error('Failed to parse sdef XML:', parseError);
									const result = createErrorResult(
										'execution',
										`Failed to parse dictionary XML: ${
											parseError instanceof Error ? parseError.message : 'Unknown error'
										}`,
										0,
										undefined,
										0,
										'ERR_PARSE_FAILED',
									);
									return {
										content: [
											{
												type: 'text',
												text: JSON.stringify(result, null, 2),
											},
										],
										isError: true,
									};
								}
							}
						} else if (mode === 'overview') {
							// Parse and return structured overview
							try {
								const overview = parseSdefOverview(sdefOutput, args.application);
								responseText = JSON.stringify(overview, null, 2);
							} catch (parseError) {
								logger.error('Failed to parse sdef XML:', parseError);
								const result = createErrorResult(
									'execution',
									`Failed to parse dictionary XML: ${
										parseError instanceof Error ? parseError.message : 'Unknown error'
									}`,
									0,
									undefined,
									0,
									'ERR_PARSE_FAILED',
								);
								return {
									content: [
										{
											type: 'text',
											text: JSON.stringify(result, null, 2),
										},
									],
									isError: true,
								};
							}
						} else if (mode === 'query') {
							// Parse and return specific queried items
							if (!args.query || args.query.length === 0) {
								const result = createErrorResult(
									'validation',
									'Query mode requires a query parameter with items to retrieve',
									0,
									undefined,
									0,
									'ERR_VALIDATION',
								);
								return {
									content: [
										{
											type: 'text',
											text: JSON.stringify(result, null, 2),
										},
									],
									isError: true,
								};
							}
							try {
								if (outputFormat === 'xml') {
									// Extract raw XML snippets for queried items
									responseText = extractSdefQueryXml(sdefOutput, args.query);
								} else {
									// Parse and return structured JSON
									const queryResult = parseSdefQuery(sdefOutput, args.query, args.application);
									responseText = JSON.stringify(queryResult, null, 2);
								}
							} catch (parseError) {
								logger.error('Failed to parse sdef XML:', parseError);
								const result = createErrorResult(
									'execution',
									`Failed to parse dictionary XML: ${
										parseError instanceof Error ? parseError.message : 'Unknown error'
									}`,
									0,
									undefined,
									0,
									'ERR_PARSE_FAILED',
								);
								return {
									content: [
										{
											type: 'text',
											text: JSON.stringify(result, null, 2),
										},
									],
									isError: true,
								};
							}
						} else {
							responseText = sdefOutput;
						}

						return {
							content: [
								{
									type: 'text',
									text: responseText,
								},
							],
						};
					} catch (error) {
						clearTimeout(timeoutId);

						// Check if it was a timeout
						if (error instanceof Error && error.name === 'AbortError') {
							const result = createErrorResult(
								'timeout',
								`Command timed out after ${timeoutMs}ms`,
								0,
								undefined,
								timeoutMs,
								'ERR_TIMEOUT',
							);
							return {
								content: [
									{
										type: 'text',
										text: JSON.stringify(result, null, 2),
									},
								],
								isError: true,
							};
						}
						throw error;
					}
				} catch (error) {
					logger.error('Failed to read dictionary:', error);
					const result = createErrorResult(
						'exception',
						error instanceof Error ? error.message : 'Unknown error',
						0,
						undefined,
						0,
						'ERR_EXCEPTION',
					);
					return {
						content: [
							{
								type: 'text',
								text: JSON.stringify(result, null, 2),
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
