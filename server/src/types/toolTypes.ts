/**
 * Tool Types for Plugin Development
 *
 * Re-exports types from bb-mcp-server for use in plugin tool definitions.
 * Provides a centralized import point for tool-related types.
 */

import type { CallToolResult } from 'mcp/types.js';
import type { ZodSchema } from 'zod';
import type { ToolCallExtra, ToolDefinition, ToolHandler, ToolRegistrationOptions } from '@beyondbetter/bb-mcp-server';

// Re-export for convenience
export type { CallToolResult, ToolCallExtra, ToolDefinition, ToolHandler, ToolRegistrationOptions };

/**
 * Extract inferred types from Zod schema record
 * Utility type for getting properly typed args from inputSchema
 */
export type InferZodSchema<T extends Record<string, ZodSchema>> = {
	[K in keyof T]: T[K] extends ZodSchema<infer U> ? U : never;
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
