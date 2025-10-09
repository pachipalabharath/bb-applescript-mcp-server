/**
 * Check AppleScript Permissions Tool
 * 
 * Checks if automation permissions are granted for specified applications.
 */

import { z } from 'zod';
import { findAndExecuteScript } from '../../../utils/scriptLoader.ts';
import type { ToolConfig, ToolDependencies } from '../../../types/toolTypes.ts';

export function getTools(dependencies: ToolDependencies, pluginDir: string): ToolConfig<any>[] {
	const { logger } = dependencies;

	return [
		{
			name: 'check_applescript_permissions',
			definition: {
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
			handler: async (args) => {
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
		},
	];
}
