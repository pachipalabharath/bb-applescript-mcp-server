# User Plugins Guide

## Overview

The AppleScript MCP Server supports **user plugins** even when running from JSR. This means you can extend the server with your own custom tools without modifying the server's code.

## How It Works

### Plugin Loading Strategy

The server uses a hybrid approach:

1. **Built-in Plugins** (Static Loading)
   - Loaded from the JSR package
   - Always available: `standard-tools`, `bbedit`
   - No configuration needed

2. **User Plugins** (Dynamic Discovery)
   - Loaded from local filesystem directories
   - Specified via `PLUGINS_DISCOVERY_PATHS` environment variable
   - Can be added without modifying the server

**Both types load together** - you get all built-in plugins plus your custom plugins.

## Quick Start

### 1. Create a Plugin Directory

```bash
mkdir -p ~/my-applescript-plugins
```

### 2. Create Your Plugin

Create a file named `my-plugin.plugin.ts`:

```typescript
import type {
  AppPlugin,
  ToolRegistry,
  WorkflowRegistry,
} from 'jsr:@beyondbetter/bb-mcp-server';
import { z } from 'npm:zod@^3.22.4';

export default {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'My custom AppleScript tools',
  workflows: [],
  tools: [],
  
  async initialize(dependencies, toolRegistry, workflowRegistry) {
    const logger = dependencies.logger;
    
    toolRegistry.registerTool(
      'my_tool',
      {
        title: 'My Custom Tool',
        description: 'Does something useful',
        category: 'Custom',
        inputSchema: {
          input: z.string().describe('Input parameter'),
        },
      },
      async (args) => {
        // Your tool logic here
        const script = `
          tell application "Finder"
            display dialog "${args.input}"
          end tell
        `;
        
        const command = new Deno.Command('osascript', {
          args: ['-e', script],
        });
        
        const { code, stdout } = await command.output();
        
        return {
          content: [{
            type: 'text',
            text: code === 0 ? 'Success!' : 'Failed',
          }],
        };
      },
    );
    
    logger.info('My custom plugin initialized');
  },
} as AppPlugin;
```

### 3. Configure the Server

#### Option A: Beyond Better

1. Open BB Settings → MCP Servers
2. Edit the AppleScript server
3. Add environment variable:
   - **Key**: `PLUGINS_DISCOVERY_PATHS`
   - **Value**: `/Users/yourname/my-applescript-plugins`

#### Option B: Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "applescript": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "--unstable-kv",
        "jsr:@beyondbetter/bb-applescript-mcp-server"
      ],
      "env": {
        "PLUGINS_DISCOVERY_PATHS": "/Users/yourname/my-applescript-plugins",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 4. Restart and Verify

Restart your MCP client and check the logs:

```
📦 AppleScript MCP Server Runtime Info:
   Import URL: https://jsr.io/@beyondbetter/bb-applescript-mcp-server/...
   Running from JSR: Yes
🌐 Running from JSR - built-in plugins loaded statically
   User plugins can be added via PLUGINS_DISCOVERY_PATHS environment variable

DependencyHelper: Registering static plugins...
  - standard-tools
  - bbedit

DependencyHelper: Discovering plugins...
  - Searching: /Users/yourname/my-applescript-plugins
  - Found: my-plugin.plugin.ts

My custom plugin initialized

DependencyHelper: Plugin registration complete
  - Total plugins: 3
  - Static plugins: 2 (built-in)
  - Discovered plugins: 1 (user)
```

Your custom tool is now available! ✅

## Multiple Plugin Directories

You can specify multiple directories separated by commas:

```bash
PLUGINS_DISCOVERY_PATHS="/Users/me/plugins1,/Users/me/plugins2"
```

## Plugin Structure Requirements

### File Naming

Your plugin file must match one of these patterns:

- `plugin.ts` - Generic plugin file
- `*.plugin.ts` - Named plugin (e.g., `mail.plugin.ts`)
- `*Plugin.ts` - Capitalized (e.g., `MailPlugin.ts`)

### Required Exports

Your plugin must export a default object with:

```typescript
export default {
  name: string;              // Unique identifier
  version: string;           // Semantic version
  description: string;       // What the plugin does
  workflows: WorkflowBase[]; // Usually empty []
  tools: ToolRegistration[]; // Usually empty []
  initialize: async (        // Setup function
    dependencies: any,
    toolRegistry: ToolRegistry,
    workflowRegistry: WorkflowRegistry,
  ) => Promise<void>;
} as AppPlugin;
```

### Dependencies Available

In the `initialize()` function, you have access to:

```typescript
{
  logger: Logger,              // Structured logging
  configManager: ConfigManager, // Configuration access
  kvManager: KVManager,         // Key-value storage
  errorHandler: ErrorHandler,   // Error handling utilities
  // ... and more
}
```

## Common Use Cases

### 1. Simple AppleScript Execution

```typescript
toolRegistry.registerTool(
  'do_something',
  {
    title: 'Do Something',
    description: 'Execute a simple AppleScript',
    category: 'Custom',
    inputSchema: {
      message: z.string(),
    },
  },
  async (args) => {
    const script = `display dialog "${args.message}"`;
    const command = new Deno.Command('osascript', {
      args: ['-e', script],
    });
    const { code, stdout } = await command.output();
    
    return {
      content: [{
        type: 'text',
        text: new TextDecoder().decode(stdout),
      }],
    };
  },
);
```

### 2. Application Control

```typescript
toolRegistry.registerTool(
  'open_safari_url',
  {
    title: 'Open Safari URL',
    description: 'Open a URL in Safari',
    category: 'Safari',
    inputSchema: {
      url: z.string().url(),
    },
  },
  async (args) => {
    const script = `
      tell application "Safari"
        activate
        open location "${args.url}"
      end tell
    `;
    // ... execute script
  },
);
```

### 3. Using Script Files

You can also load scripts from files:

```typescript
import { dirname, fromFileUrl, join } from '@std/path';

const pluginDir = dirname(fromFileUrl(import.meta.url));
const scriptPath = join(pluginDir, 'scripts', 'my_script.applescript');

const scriptContent = await Deno.readTextFile(scriptPath);
// ... execute script
```

## Advanced Features

### 1. Template Variables

Use the server's template system:

```typescript
import { renderTemplate } from './path/to/templateRenderer.ts';

const script = renderTemplate(
  'tell application "${app}" to ${action}',
  { app: 'Finder', action: 'activate' }
);
```

### 2. Error Handling

Use consistent error formats:

```typescript
import { createErrorResult } from './path/to/errorHandler.ts';

try {
  // ... your code
} catch (error) {
  return createErrorResult(
    'script_error',
    'Failed to execute script',
    error instanceof Error ? error.message : 'Unknown error'
  );
}
```

### 3. Multiple Tools in One Plugin

Register multiple related tools:

```typescript
async initialize(dependencies, toolRegistry, workflowRegistry) {
  const tools = [
    { name: 'tool1', /* ... */ },
    { name: 'tool2', /* ... */ },
    { name: 'tool3', /* ... */ },
  ];
  
  for (const tool of tools) {
    toolRegistry.registerTool(tool.name, tool.definition, tool.handler);
  }
}
```

## Filtering Plugins

You can control which plugins load:

### Allow Specific Plugins

```bash
PLUGINS_ALLOWED="standard-tools,bbedit,my-custom-plugin"
```

Only these plugins will load (others are ignored).

### Block Specific Plugins

```bash
PLUGINS_BLOCKED="experimental-plugin"
```

All plugins except these will load.

### Disable Discovery Entirely

```bash
PLUGINS_AUTOLOAD=false
```

Only built-in static plugins will load (no user plugins).

## Debugging

Enable debug logging to see plugin discovery details:

```bash
LOG_LEVEL=debug
```

You'll see detailed logs:

```
PluginManager: Loading plugin from /Users/me/my-plugins/my-plugin.plugin.ts
PluginManager: Found plugin factory function: default
PluginManager: Successfully created plugin: my-custom-plugin
PluginManager: Registering plugin: my-custom-plugin
ToolRegistry: Registered tool: my_tool
```

## Security Considerations

1. **User plugins run with server permissions** - only install trusted plugins
2. **AppleScript has system access** - be careful with script execution
3. **Validate inputs** - always use Zod schemas to validate parameters
4. **Escape user input** - when building AppleScript strings
5. **Review plugin code** - before deploying to production

## Examples

See complete working examples:

- **[Mail Plugin Example](examples/user-plugin-example.ts)** - Send emails, check unread count
- **[Standard Plugin](../server/src/plugins/standard.plugin/plugin.ts)** - Built-in tools
- **[BBEdit Plugin](../server/src/plugins/bbedit.plugin/plugin.ts)** - BBEdit integration

## Resources

- **[Plugin Loading Documentation](PLUGIN_LOADING.md)** - Technical details
- **[Creating Plugins Guide](creating-plugins.md)** - Comprehensive guide
- **[Examples README](examples/README.md)** - Example plugin documentation
- **[AppleScript Language Guide](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)** - Apple docs

## Troubleshooting

### Plugin Not Loading

1. **Check file naming** - Must match `*.plugin.ts` or similar pattern
2. **Check path** - `PLUGINS_DISCOVERY_PATHS` must be absolute path
3. **Check syntax** - Run `deno check your-plugin.plugin.ts`
4. **Check logs** - Look for error messages in server output
5. **Check export** - Must have `export default { ... } as AppPlugin`

### Tool Not Appearing

1. **Check registration** - Ensure `toolRegistry.registerTool()` is called
2. **Check plugin init** - Plugin's `initialize()` must complete successfully
3. **Check filters** - Ensure plugin isn't blocked by `PLUGINS_ALLOWED`/`PLUGINS_BLOCKED`
4. **Restart client** - MCP clients cache tool lists

### Permission Errors

1. **Grant automation permissions** - System Settings → Privacy → Automation
2. **Check script syntax** - Use `osascript -e 'your script'` to test
3. **Check app availability** - Ensure target application is installed

## Need Help?

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions or share plugins
- **Examples**: Review working plugin code
- **Documentation**: Check the comprehensive guides

---

**Happy plugin building!** 🚀
