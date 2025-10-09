/**
 * BBEdit Plugin
 * Provides tools for working with BBEdit notebooks and projects
 */

import { AppPlugin, ToolRegistry, WorkflowRegistry } from 'jsr:@beyondbetter/bb-mcp-server';
import { dirname, fromFileUrl } from '@std/path';
import { z } from 'zod';
import { findAndExecuteScript } from '../../utils/scriptLoader.ts';

// Get the plugin directory path
const getPluginDir = (): string => {
	const currentFileUrl = import.meta.url;
	return dirname(fromFileUrl(currentFileUrl));
};

export default {
	name: 'bbedit',
	version: '1.0.0',
	description: 'Tools for creating and managing BBEdit notebooks and projects',

	async initialize(
		dependencies: any,
		toolRegistry: ToolRegistry,
		workflowRegistry: WorkflowRegistry,
	): Promise<void> {
		const logger = dependencies.logger;
		const pluginDir = getPluginDir();

		// Register create_notebook tool
		toolRegistry.registerTool(
			'create_bbedit_notebook',
			{
				title: 'Create BBEdit Notebook',
				description:
					'Create a new BBEdit notebook with optional initial content. Notebooks are collections of text documents in BBEdit.',
				category: 'BBEdit',
				inputSchema: {
					name: z.string().describe('Name of the notebook'),
					location: z
						.string()
						.optional()
						.describe(
							'Directory path where the notebook should be saved (default: ~/Documents/BBEdit Notebooks/)',
						),
					content: z
						.array(
							z.object({
								type: z
									.enum(['text', 'file'])
									.describe('Type of content: "text" for direct text content, "file" for file path'),
								data: z
									.string()
									.describe(
										'Text content (if type is "text") or file path (if type is "file") to add to notebook',
									),
							}),
						)
						.optional()
						.describe('Array of content items to add to the notebook'),
					open: z
						.boolean()
						.optional()
						.default(true)
						.describe('Whether to open the notebook after creation (default: true)'),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
			},
			async (args) => {
				try {
					logger.info(`Creating BBEdit notebook: ${args.name}`);

					// Prepare template variables
					const variables: Record<string, any> = {
						name: args.name,
						location: args.location || 'missing value',
						contentJson: args.content ? JSON.stringify(args.content) : '[]',
						shouldOpen: args.open !== false, // Default to true
					};

					const result = await findAndExecuteScript(
						pluginDir,
						'create_notebook',
						variables,
						undefined,
						args.timeout,
						logger,
					);

					if (result.success) {
						// Parse the JSON result from the script
						let scriptResult;
						try {
							scriptResult = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
						} catch {
							scriptResult = result.result;
						}

						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(
										{
											success: true,
											...scriptResult,
											metadata: result.metadata,
										},
										null,
										2,
									),
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
					logger.error('Failed to create BBEdit notebook:', error);
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

		// Register create_project tool
		toolRegistry.registerTool(
			'create_bbedit_project',
			{
				title: 'Create BBEdit Project',
				description:
					'Create a new BBEdit project with optional files and folders. Projects organize multiple files and folders for easy access.',
				category: 'BBEdit',
				inputSchema: {
					name: z.string().describe('Name of the project'),
					location: z
						.string()
						.optional()
						.describe(
							'Directory path where the project should be saved (default: ~/Documents/BBEdit Projects/)',
						),
					items: z
						.array(z.string())
						.optional()
						.describe(
							'Array of file and/or folder paths to add to the project. Can include both files and folders.',
						),
					settings: z
						.object({
							useGit: z.boolean().optional().describe('Whether to enable Git integration'),
						})
						.optional()
						.describe('Project settings (reserved for future use)'),
					open: z
						.boolean()
						.optional()
						.default(true)
						.describe('Whether to open the project after creation (default: true)'),
					timeout: z.number().optional().describe('Timeout in milliseconds'),
				},
			},
			async (args) => {
				try {
					logger.info(`Creating BBEdit project: ${args.name}`);

					// Prepare template variables
					const variables: Record<string, any> = {
						name: args.name,
						location: args.location || 'missing value',
						itemsJson: args.items ? JSON.stringify(args.items) : '[]',
						settingsJson: args.settings ? JSON.stringify(args.settings) : 'missing value',
						shouldOpen: args.open !== false, // Default to true
					};

					const result = await findAndExecuteScript(
						pluginDir,
						'create_project',
						variables,
						undefined,
						args.timeout,
						logger,
					);

					if (result.success) {
						// Parse the JSON result from the script
						let scriptResult;
						try {
							scriptResult = typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
						} catch {
							scriptResult = result.result;
						}

						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(
										{
											success: true,
											...scriptResult,
											metadata: result.metadata,
										},
										null,
										2,
									),
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
					logger.error('Failed to create BBEdit project:', error);
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

		logger.info('BBEdit plugin initialized');
	},
} as AppPlugin;
