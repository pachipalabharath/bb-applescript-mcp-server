#!/usr/bin/env -S deno run --allow-all --unstable-kv

import { AppServer } from '@beyondbetter/bb-mcp-server';
import { createAppleScriptDependencies } from './src/dependencyHelper.ts';

// Create app with dependencies using appropriate plugin loading strategy
const appServer = await AppServer.create(createAppleScriptDependencies);

await appServer.start();
