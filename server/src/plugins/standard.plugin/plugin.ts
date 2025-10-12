/**
 * Standard Tools Plugin
 * Provides core AppleScript tools including dictionary reading, permissions checking,
 * and Finder operations that don't have simple CLI equivalents
 */

import { AppPlugin, ToolRegistration, ToolRegistry, WorkflowBase, WorkflowRegistry } from '@beyondbetter/bb-mcp-server';
import { getTools as getRunScriptTools } from './tools/runScript.ts';
import { getTools as getReadDictionaryTools } from './tools/readDictionary.ts';
import { getTools as getCheckPermissionsTools } from './tools/checkPermissions.ts';
import { getTools as getFinderTools } from './tools/finderTools.ts';
import { getPluginDir } from '../../utils/pluginUtils.ts';

export default {
  name: 'standard-tools',
  version: '1.0.0',
  description: 'Standard AppleScript tools for macOS automation',

  workflows: [] as WorkflowBase[],
  tools: [] as ToolRegistration[],

  async initialize(
    dependencies: any,
    toolRegistry: ToolRegistry,
    workflowRegistry: WorkflowRegistry,
  ): Promise<void> {
    const logger = dependencies.logger;
    const pluginDir = getPluginDir();

    // Collect all tools from the tool modules
    // scriptLoader.ts will automatically detect and use inlined scripts (JSR) or files (local)
    const allTools = [
      ...getRunScriptTools(dependencies),
      ...getReadDictionaryTools(dependencies),
      ...getCheckPermissionsTools(dependencies, pluginDir),
      ...getFinderTools(dependencies, pluginDir),
    ];

    // Register all tools with the tool registry
    for (const tool of allTools) {
      toolRegistry.registerTool(
        tool.name,
        tool.definition,
        tool.handler,
        tool.options,
      );
    }

    logger.info('Standard Tools plugin initialized');
  },
} as AppPlugin;
