/**
 * Finder Tools
 *
 * Collection of tools for interacting with macOS Finder.
 * Includes label management, file info, selection, and reveal operations.
 */

import { z } from 'zod';
import { findAndExecuteScript } from '../../../utils/scriptLoader.ts';
import type { ToolConfig, ToolDependencies } from '../../../types/toolTypes.ts';

// Input schemas
const setFileLabelInputSchema = {
	paths: z.array(z.string()).describe('Array of file/folder paths'),
	labelIndex: z
		.number()
		.min(0)
		.max(7)
		.describe('Label index: 0=None, 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue, 6=Purple, 7=Gray'),
	timeout: z.number().optional().describe('Timeout in milliseconds'),
} as const;

const getFileLabelInputSchema = {
	paths: z.array(z.string()).describe('Array of file/folder paths'),
	timeout: z.number().optional().describe('Timeout in milliseconds'),
} as const;

const getFileInfoExtendedInputSchema = {
	path: z.string().describe('Path to file or folder'),
	timeout: z.number().optional().describe('Timeout in milliseconds'),
} as const;

const revealInFinderInputSchema = {
	paths: z.array(z.string()).describe('Array of file/folder paths to reveal'),
	timeout: z.number().optional().describe('Timeout in milliseconds'),
} as const;

const getFinderSelectionInputSchema = {
	timeout: z.number().optional().describe('Timeout in milliseconds'),
} as const;

// Type definitions
type SetFileLabelArgs = {
	paths: string[];
	labelIndex: number;
	timeout?: number;
};

type GetFileLabelArgs = {
	paths: string[];
	timeout?: number;
};

type GetFileInfoExtendedArgs = {
	path: string;
	timeout?: number;
};

type RevealInFinderArgs = {
	paths: string[];
	timeout?: number;
};

type GetFinderSelectionArgs = {
	timeout?: number;
};

export function getTools(dependencies: ToolDependencies, pluginDir: string): ToolConfig<any>[] {
	const { logger } = dependencies;

	return [
		// Set File Label Tool
		{
			name: 'set_file_label',
			definition: {
				title: 'Set Finder Label Color',
				description: 'Set the Finder label color for one or more files or folders',
				category: 'Finder',
				inputSchema: setFileLabelInputSchema,
			},
			handler: (async (args: SetFileLabelArgs) => {
				try {
					logger.info('Executing Finder tool: set_file_label');

					const scriptArgs = [
						JSON.stringify(args.paths),
						String(args.labelIndex),
					];

					const result = await findAndExecuteScript(
						pluginDir,
						'finder/set_file_label',
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
					logger.error('Failed to execute set_file_label:', error);
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
			}) as any,
		},

		// Get File Label Tool
		{
			name: 'get_file_label',
			definition: {
				title: 'Get Finder Label Color',
				description: 'Get the Finder label color for one or more files or folders',
				category: 'Finder',
				inputSchema: getFileLabelInputSchema,
			},
			handler: (async (args: GetFileLabelArgs) => {
				try {
					logger.info('Executing Finder tool: get_file_label');

					const scriptArgs = [JSON.stringify(args.paths)];

					const result = await findAndExecuteScript(
						pluginDir,
						'finder/get_file_label',
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
					logger.error('Failed to execute get_file_label:', error);
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
			}) as any,
		},

		// Get File Info Extended Tool
		{
			name: 'get_file_info_extended',
			definition: {
				title: 'Get Extended File Information',
				description:
					'Get detailed information about a file including Spotlight comments, tags, label color, and other metadata',
				category: 'Finder',
				inputSchema: getFileInfoExtendedInputSchema,
			},
			handler: (async (args: GetFileInfoExtendedArgs) => {
				try {
					logger.info('Executing Finder tool: get_file_info_extended');

					const scriptArgs: string[] = [args.path];

					const result = await findAndExecuteScript(
						pluginDir,
						'finder/get_file_info_extended',
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
					logger.error('Failed to execute get_file_info_extended:', error);
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
			}) as any,
		},

		// Reveal in Finder Tool
		{
			name: 'reveal_in_finder',
			definition: {
				title: 'Reveal in Finder',
				description: 'Reveal and select one or more files or folders in Finder',
				category: 'Finder',
				inputSchema: revealInFinderInputSchema,
			},
			handler: (async (args: RevealInFinderArgs) => {
				try {
					logger.info('Executing Finder tool: reveal_in_finder');

					const scriptArgs = [JSON.stringify(args.paths)];

					const result = await findAndExecuteScript(
						pluginDir,
						'finder/reveal_in_finder',
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
					logger.error('Failed to execute reveal_in_finder:', error);
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
			}) as any,
		},

		// Get Finder Selection Tool
		{
			name: 'get_finder_selection',
			definition: {
				title: 'Get Finder Selection',
				description: 'Get the currently selected items in Finder',
				category: 'Finder',
				inputSchema: getFinderSelectionInputSchema,
			},
			handler: (async (args: GetFinderSelectionArgs) => {
				try {
					logger.info('Executing Finder tool: get_finder_selection');

					const result = await findAndExecuteScript(
						pluginDir,
						'finder/get_selection',
						undefined,
						[],
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
					logger.error('Failed to execute get_finder_selection:', error);
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
			}) as any,
		},
	];
}
