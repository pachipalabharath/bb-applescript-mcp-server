#!/usr/bin/env -S deno run --allow-all --unstable-kv

import { AppServer } from '@beyondbetter/bb-mcp-server';

const appServer = await AppServer.create({
	serverConfig: {
		name: 'applescript-mcp-server',
		version: '0.1.0',
		title: 'AppleScript MCP Server',
		description: 'MCP server for executing AppleScript scripts to interact with macOS applications',
	},
});

await appServer.start();
