/**
 * Tool Types for Plugin Development
 * 
 * Re-exports types from bb-mcp-server for use in plugin tool definitions.
 * Provides a centralized import point for tool-related types.
 */

import type { CallToolResult } from 'mcp/types.js';
import type { ZodSchema } from 'zod';
import type {
	ToolDefinition,
	ToolHandler,
	ToolRegistrationOptions,
	ToolCallExtra,
} from 'jsr:@beyondbetter/bb-mcp-server';

// Re-export for convenience
export type {
	CallToolResult,
	ToolDefinition,
	ToolHandler,
	ToolRegistrationOptions,
	ToolCallExtra,
};

/**
 * Tool configuration for registration
 * Matches the parameters expected by ToolRegistry.registerTool
 */
export interface ToolConfig<T extends Record<string, ZodSchema>> {
	name: string;
	definition: ToolDefinition<T>;
	handler: ToolHandler<T>;
	options?: ToolRegistrationOptions;
}

/**
 * Dependencies passed to tool files from plugin initialization
 */
export interface ToolDependencies {
	logger: any;
	configManager?: any;
	auditLogger?: any;
	errorHandler?: any;
	[key: string]: any;
}
