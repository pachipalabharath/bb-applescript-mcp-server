/**
 * Run Script Tool
 *
 * Executes arbitrary AppleScript code.
 * Can be enabled/disabled via ENABLE_ARBITRARY_SCRIPTS environment variable.
 */

import { z } from 'zod';
import { runAppleScript } from '../../../utils/scriptRunner.ts';
import { createErrorResult } from '../../../utils/errorHandler.ts';
import type { ToolConfig, ToolDependencies } from '../../../types/toolTypes.ts';

// Input schema
const runScriptInputSchema = {
  script: z.string().describe('The AppleScript code to execute'),
  timeout: z.number().optional().describe(
    'Timeout in milliseconds (default: 30000, max: configured max)',
  ),
} as const;

// Type definition
type RunScriptArgs = {
  script: string;
  timeout?: number;
};

const isArbitraryScriptsEnabled = (): boolean => {
  return Deno.env.get('ENABLE_ARBITRARY_SCRIPTS') === 'true';
};

export function getTools(dependencies: ToolDependencies): ToolConfig<any>[] {
  const { logger } = dependencies;

  if (isArbitraryScriptsEnabled()) {
    // Enabled version
    return [
      {
        name: 'run_script',
        definition: {
          title: 'Run Arbitrary AppleScript',
          description:
            'Execute arbitrary AppleScript code. WARNING: This is a powerful and potentially dangerous tool. Only use with trusted code.',
          category: 'AppleScript',
          inputSchema: runScriptInputSchema,
        },
        handler: (async (args: RunScriptArgs) => {
          try {
            logger.info('Executing arbitrary AppleScript');

            const result = await runAppleScript({
              script: args.script,
              inline: true,
              timeout: args.timeout ?? 30000,
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
        }) as any,
      },
    ];
  } else {
    // Disabled version
    return [
      {
        name: 'run_script',
        definition: {
          title: 'Run Arbitrary AppleScript (Disabled)',
          description:
            'Execute arbitrary AppleScript code. Currently DISABLED for safety. To enable, set ENABLE_ARBITRARY_SCRIPTS=true in the environment configuration.',
          category: 'AppleScript',
          inputSchema: runScriptInputSchema,
        },
        handler: (async (_args: RunScriptArgs) => {
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
        }) as any,
      },
    ];
  }
}
