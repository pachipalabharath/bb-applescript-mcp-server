/**
 * Example User Plugin for AppleScript MCP Server
 * 
 * This demonstrates how users can create custom plugins that work
 * with the AppleScript MCP Server, even when running from JSR.
 * 
 * To use this plugin:
 * 1. Save this file to a local directory (e.g., ~/my-applescript-plugins/mail.plugin.ts)
 * 2. Set PLUGINS_DISCOVERY_PATHS environment variable to that directory
 * 3. Restart the MCP server
 * 
 * The plugin will be discovered and loaded alongside the built-in plugins.
 */

import type {
	AppPlugin,
	ToolRegistry,
	WorkflowRegistry,
} from 'jsr:@beyondbetter/bb-mcp-server';
import { z } from 'npm:zod@^3.22.4';
import { runAppleScript } from '../../server/src/utils/scriptRunner.ts';
import type { AppleScriptResult } from '../../server/src/utils/errorHandler.ts';

/**
 * Example: Mail.app plugin
 * Provides tools for sending emails via Mail.app
 */
export default {
	name: 'mail-tools',
	version: '1.0.0',
	description: 'Tools for sending emails via Mail.app',
	author: 'Your Name',

	workflows: [],
	tools: [],

	async initialize(
		dependencies: any,
		toolRegistry: ToolRegistry,
		workflowRegistry: WorkflowRegistry,
	): Promise<void> {
		const logger = dependencies.logger;

		logger.info('Initializing Mail Tools plugin');

		// Register send_email tool
		toolRegistry.registerTool(
			'send_email',
			{
				title: 'Send Email',
				description: 'Create and send an email via Mail.app',
				category: 'Mail',
				inputSchema: {
					to: z.string().email().describe('Recipient email address'),
					subject: z.string().describe('Email subject'),
					body: z.string().describe('Email body text'),
					cc: z.array(z.string().email()).optional().describe('CC recipients'),
					attachments: z.array(z.string()).optional().describe('File paths to attach'),
				},
			},
			async (args) => {
				try {
					logger.info('Sending email', { to: args.to, subject: args.subject });

					// Build AppleScript to send email
					const script = `
						tell application "Mail"
							set newMessage to make new outgoing message with properties {subject:"${args.subject}", content:"${args.body}"}
							tell newMessage
								make new to recipient at end of to recipients with properties {address:"${args.to}"}
								${args.cc ? args.cc.map((email: string) => `make new cc recipient at end of cc recipients with properties {address:"${email}"}`).join('\n\t\t\t\t\t\t\t\t') : ''}
								send
							end tell
						end tell
						return "Email sent successfully"
					`;

					// Execute AppleScript using runAppleScript utility
					const result: AppleScriptResult = await runAppleScript({
						script,
						inline: true,
						logger,
					});

					if (result.success) {
						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(
										{
											success: true,
											message: 'Email sent successfully',
											to: args.to,
											subject: args.subject,
											result: result.output,
										},
										null,
										2,
									),
								},
							],
						};
					} else {
						const errorMsg = result.error?.message || 'Unknown error';
						logger.error('Failed to send email', new Error(errorMsg));
						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(
										{
											success: false,
											error: errorMsg,
											details: result.error?.details,
										},
										null,
										2,
									),
								},
							],
							isError: true,
						};
					}
				} catch (error) {
					logger.error('Failed to send email', error as Error);
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

		// Register check_mail tool
		toolRegistry.registerTool(
			'check_unread_mail',
			{
				title: 'Check Unread Mail',
				description: 'Get count of unread emails in Mail.app',
				category: 'Mail',
				inputSchema: {
					mailbox: z.string().optional().describe('Mailbox name (default: INBOX)'),
				},
			},
			async (args) => {
				try {
					const mailbox = args.mailbox || 'INBOX';
					const script = `
						tell application "Mail"
							set unreadCount to count of (messages of inbox whose read status is false)
							return unreadCount
						end tell
					`;

					const result: AppleScriptResult = await runAppleScript({
						script,
						inline: true,
						logger,
					});

					if (result.success) {
						const count = parseInt(result.output || '0');
						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(
										{
											success: true,
											mailbox,
											unreadCount: count,
											message: `You have ${count} unread email${count !== 1 ? 's' : ''}`,
										},
										null,
										2,
									),
								},
							],
						};
					} else {
						const errorMsg = result.error?.message || 'Failed to check mail';
						return {
							content: [
								{
									type: 'text',
									text: JSON.stringify(
										{
											success: false,
											error: errorMsg,
											details: result.error?.details,
										},
										null,
										2,
									),
								},
							],
							isError: true,
						};
					}
				} catch (error) {
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

		logger.info('Mail Tools plugin initialized', {
			tools: ['send_email', 'check_unread_mail'],
		});
	},
} as AppPlugin;
