/**
 * Standard Tools Plugin
 * Provides core AppleScript tools including dictionary reading, permissions checking,
 * and Finder operations that don't have simple CLI equivalents
 */

import { AppPlugin, ToolRegistry, WorkflowRegistry } from 'jsr:@beyondbetter/bb-mcp-server';
import { dirname, fromFileUrl } from '@std/path';
import { z } from 'zod';
import { findAndExecuteScript } from '../../utils/scriptLoader.ts';
import { runAppleScript } from '../../utils/scriptRunner.ts';
import { createErrorResult } from '../../utils/errorHandler.ts';
import { parseSdefOverview, parseSdefQuery, parseSdefFull, extractSdefQueryXml } from '../../utils/sdefParser.ts';

const isArbitraryScriptsEnabled = (): boolean => {
	return Deno.env.get('ENABLE_ARBITRARY_SCRIPTS') === 'true';
};

// Get the plugin directory path
const getPluginDir = (): string => {
	const currentFileUrl = import.meta.url;
	return dirname(fromFileUrl(currentFileUrl));
};

export default {
	name: 'standard-tools',
	version: '1.0.0',
	description: 'Standard AppleScript tools for macOS automation',

	async initialize(
		dependencies: any,
		toolRegistry: ToolRegistry,
		workflowRegistry: WorkflowRegistry,
	): Promise<void> {
		const logger = dependencies.logger;
		const pluginDir = getPluginDir();

		// Register run_script tool (if enabled)
		if (isArbitraryScriptsEnabled()) {
			toolRegistry.registerTool(
				'run_script',
				{
					title: 'Run Arbitrary AppleScript',
					description:
						'Execute arbitrary AppleScript code. WARNING: This is a powerful and potentially dangerous tool. Only use with trusted code.',
					category: 'AppleScript',
					inputSchema: {
						script: z.string().describe('The AppleScript code to execute'),
						timeout: z
							.number()
							.optional()
							.describe('Timeout in milliseconds (default: 30000, max: configured max)'),
					},
				},
				async (args) => {
					try {
						logger.info('Executing arbitrary AppleScript');

						const result = await runAppleScript({
							script: args.script,
							inline: true,
							timeout: args.timeout,
							logger,
						});

						if (result.success) {
							return {
								content: [
									{
										type: 'text',
										text: JSON.stringify(result, null, 2),
									},
								],
							};
						} else {
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
					} catch (error) {
						logger.error('Failed to execute AppleScript:', error);
						return {
							content: [
								{
									type: 'text',
									text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
								},
							],
							isError: true,
						};
					}
				},
			);
		} else {
			// Register disabled version that explains why it's not available
			toolRegistry.registerTool(
				'run_script',
				{
					title: 'Run Arbitrary AppleScript (Disabled)',
					description:
						'Execute arbitrary AppleScript code. Currently DISABLED for safety. To enable, set ENABLE_ARBITRARY_SCRIPTS=true in the environment configuration.',
					category: 'AppleScript',
					inputSchema: {
						script: z.string().describe('The AppleScript code to execute'),
						timeout: z.number().optional().describe('Timeout in milliseconds'),
					},
				},
				async (_args) => {
					const result = createErrorResult(
						'disabled',
						'The run_script tool is disabled for safety',
						0,
						undefined,
						0,
						'ERR_DISABLED',
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
				},
			);
		}

		// Register read_dictionary tool
		toolRegistry.registerTool(
			'read_dictionary',
			{
				title: 'Read AppleScript Dictionary',
				description:
					'Read the AppleScript dictionary for an application. Returns available classes, commands, properties, and events. Use this to understand what AppleScript operations are available for an application.',
				category: 'AppleScript',
				inputSchema: {
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
				},
			},
			async (args) => {
				try {
					logger.info(`Reading dictionary for ${args.application}`);

					const timeoutMs = args.timeout || 30000;

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
										`Failed to parse dictionary XML: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
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
									`Failed to parse dictionary XML: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
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
									`Failed to parse dictionary XML: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
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
		);

		// Register check_applescript_permissions tool
		toolRegistry.registerTool(
			'check_applescript_permissions',
			{
				title: 'Check AppleScript Automation Permissions',
				description:
					'Check if automation permissions are granted for specified applications. Returns status for each application and instructions for granting permissions if needed.',
				category: 'AppleScript',
				inputSchema: {
					applications: z
						.array(z.string())
						.optional()
						.describe(
							'List of application names to check (e.g., ["Finder", "BBEdit"]). If not provided, checks common applications.',
						),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
			},
			async (args) => {
				try {
					logger.info('Checking AppleScript permissions');

					const appsJson = args.applications ? JSON.stringify(args.applications) : '';
					const scriptArgs = appsJson ? [appsJson] : [];

					const result = await findAndExecuteScript(
						pluginDir,
						'check_permissions',
						undefined,
						scriptArgs,
						args.timeout,
						logger,
					);

					if (result.success) {
						return {
							content: [
								{
									type: 'text',
									text: typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2),
								},
							],
						};
					} else {
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
				} catch (error) {
					logger.error('Failed to check permissions:', error);
					return {
						content: [
							{
								type: 'text',
								text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
							},
						],
						isError: true,
					};
				}
			},
		);

		// Register Finder tools
		const finderTools = [
			{
				name: 'set_file_label',
				title: 'Set Finder Label Color',
				description: 'Set the Finder label color for one or more files or folders',
				schema: {
					paths: z.array(z.string()).describe('Array of file/folder paths'),
					labelIndex: z
						.number()
						.min(0)
						.max(7)
						.describe('Label index: 0=None, 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue, 6=Purple, 7=Gray'),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
				scriptName: 'finder/set_file_label',
			},
			{
				name: 'get_file_label',
				title: 'Get Finder Label Color',
				description: 'Get the Finder label color for one or more files or folders',
				schema: {
					paths: z.array(z.string()).describe('Array of file/folder paths'),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
				scriptName: 'finder/get_file_label',
			},
			{
				name: 'get_file_info_extended',
				title: 'Get Extended File Information',
				description:
					'Get detailed information about a file including Spotlight comments, tags, label color, and other metadata',
				schema: {
					path: z.string().describe('Path to file or folder'),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
				scriptName: 'finder/get_file_info_extended',
			},
			{
				name: 'reveal_in_finder',
				title: 'Reveal in Finder',
				description: 'Reveal and select one or more files or folders in Finder',
				schema: {
					paths: z.array(z.string()).describe('Array of file/folder paths to reveal'),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
				scriptName: 'finder/reveal_in_finder',
			},
			{
				name: 'get_finder_selection',
				title: 'Get Finder Selection',
				description: 'Get the currently selected items in Finder',
				schema: {
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
				scriptName: 'finder/get_selection',
			},
		];

		for (const tool of finderTools) {
			toolRegistry.registerTool(
				tool.name,
				{
					title: tool.title,
					description: tool.description,
					category: 'Finder',
					inputSchema: tool.schema,
				},
				async (args: any) => {
					try {
						logger.info(`Executing Finder tool: ${tool.name}`);

						// Build script arguments based on the tool
						const scriptArgs: string[] = [];

						if ('paths' in args) {
							scriptArgs.push(JSON.stringify(args.paths));
						}

						if ('path' in args) {
							scriptArgs.push(args.path);
						}

						if ('labelIndex' in args) {
							scriptArgs.push(String(args.labelIndex));
						}

						const result = await findAndExecuteScript(
							pluginDir,
							tool.scriptName,
							undefined,
							scriptArgs,
							args.timeout,
							logger,
						);

						if (result.success) {
							return {
								content: [
									{
										type: 'text',
										text: typeof result.result === 'string'
											? result.result
											: JSON.stringify(result.result, null, 2),
									},
								],
							};
						} else {
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
					} catch (error) {
						logger.error(`Failed to execute ${tool.name}:`, error);
						return {
							content: [
								{
									type: 'text',
									text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
								},
							],
							isError: true,
						};
					}
				},
			);
		}

		logger.info('Standard Tools plugin initialized');
	},
} as AppPlugin;
