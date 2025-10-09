#!/usr/bin/env -S deno run --allow-all --unstable-kv

import { AppServer } from 'jsr:@beyondbetter/bb-mcp-server';

const appServer = await AppServer.create({
  serverConfig: {
    name: 'applescript-mcp-server',
    version: '1.0.0',
    title: 'AppleScript MCP Server',
    description: 'MCP server for executing AppleScript scripts to interact with macOS applications',
  },
  pluginConfig: {
    discoveryPaths: ['./src/plugins'],
    autoLoad: true,
  },
});

await appServer.start();
