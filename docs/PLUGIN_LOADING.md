# Plugin Loading Strategy

## Problem

When an MCP server is run directly from JSR (e.g., `jsr:@beyondbetter/bb-applescript-mcp-server`), dynamic plugin discovery using filesystem operations doesn't work because:

1. JSR packages are loaded via HTTPS URLs, not local filesystem paths
2. The `Deno.readDir()` API cannot traverse remote module directories
3. Plugin files are bundled into the JSR package but aren't accessible via filesystem APIs

## Solution

We use a **hybrid approach** that detects the runtime environment and adapts the plugin loading strategy:

### Runtime Detection

The `isRunningFromJsr()` function in `server/src/dependencyHelper.ts` detects the runtime environment by examining `import.meta.url`:

- **JSR**: URLs like `https://jsr.io/@scope/package/...` or `https://esm.sh/jsr/...`
- **Local**: URLs like `file:///path/to/project/...`

### Plugin Loading Strategies

#### 1. JSR Mode (Static Built-in Plugins + User Plugin Discovery)

When running from JSR:

**Built-in Plugins (Static)**:
- Statically imported at the top of `dependencyHelper.ts`
- Registered via the `staticPlugins` array in `AppServerDependencies`
- Always available (standard-tools, bbedit)

**User Plugins (Dynamic Discovery)**:
- Can be loaded from filesystem via `PLUGINS_DISCOVERY_PATHS`
- Requires `PLUGINS_AUTOLOAD=true` (default)
- User specifies local directory paths
- Allows extending the server with custom plugins

```typescript
// Static imports for JSR deployment
import standardPlugin from './plugins/standard.plugin/plugin.ts';
import bbeditPlugin from './plugins/bbedit.plugin/plugin.ts';

export function getStaticPlugins(): AppPlugin[] {
  return [
    standardPlugin,
    bbeditPlugin,
  ];
}
```

#### 2. Local Mode (Dynamic Discovery + Static Fallback)

When running locally, plugins are:
- Statically imported as a fallback
- Discovered dynamically from the filesystem (if enabled via config)
- Both static and discovered plugins are registered

### How bb-mcp-server Handles This

The bb-mcp-server library's `PluginManager` supports both strategies:

1. **Static Plugins**: Registered first from `dependencies.staticPlugins`
2. **Dynamic Discovery**: Runs afterward if `autoload: true` in plugin config
3. **Hybrid Mode**: Both can coexist - static plugins + discovered plugins

See `bb-mcp-server/src/lib/server/DependencyHelpers.ts` function `registerPluginsInRegistries()`:

```typescript
// STEP 1: Register static plugins
if (staticPlugins && staticPlugins.length > 0) {
  for (const plugin of staticPlugins) {
    await pluginManager.registerPlugin(plugin);
  }
}

// STEP 2: Discover and load plugins if autoload is enabled
if (pluginConfig.autoload) {
  const discoveredPlugins = await pluginManager.discoverPlugins();
}
```

## Implementation Details

### File: `server/src/dependencyHelper.ts`

This file provides:

- `isRunningFromJsr()`: Runtime environment detection
- `getStaticPlugins()`: Returns array of statically imported plugins
- `createAppleScriptDependencies()`: Creates appropriate dependencies based on runtime
- `logRuntimeInfo()`: Logs runtime information for debugging

### File: `server/main.ts`

The main entry point uses the dependency helper:

```typescript
import { createAppleScriptDependencies, logRuntimeInfo } from './src/dependencyHelper.ts';

logRuntimeInfo();
const dependencies = await createAppleScriptDependencies();

const appServer = await AppServer.create({
  serverConfig: { /* ... */ },
}, dependencies);
```

## Adding New Plugins

When adding a new plugin, you must:

1. **Create the plugin** in `server/src/plugins/your-plugin.plugin/plugin.ts`
2. **Add static import** to `dependencyHelper.ts`:
   ```typescript
   import yourPlugin from './plugins/your-plugin.plugin/plugin.ts';
   ```
3. **Add to static plugins array**:
   ```typescript
   export function getStaticPlugins(): AppPlugin[] {
     return [
       standardPlugin,
       bbeditPlugin,
       yourPlugin,  // Add here
     ];
   }
   ```

This ensures the plugin works in both JSR and local environments.

## Adding Custom Plugins (User Plugins)

### When Running from JSR

Users can add their own plugins even when running the server from JSR. The built-in plugins (standard-tools, bbedit) are loaded statically, but user plugins are discovered from the filesystem.

#### Step 1: Create Your Plugin Directory

```bash
# Create a directory for your custom plugins
mkdir -p ~/my-applescript-plugins
```

#### Step 2: Add Your Plugin

Create a plugin file following the naming convention:

```typescript
// ~/my-applescript-plugins/mail.plugin.ts
import { AppPlugin, ToolRegistry, WorkflowRegistry } from 'jsr:@beyondbetter/bb-mcp-server';
import { z } from 'npm:zod@^3.22.4';

export default {
  name: 'mail-tools',
  version: '1.0.0',
  description: 'Custom Mail.app tools',
  workflows: [],
  tools: [],
  
  async initialize(
    dependencies: any,
    toolRegistry: ToolRegistry,
    workflowRegistry: WorkflowRegistry,
  ): Promise<void> {
    // Register your tools here
    toolRegistry.registerTool(
      'send_email',
      {
        title: 'Send Email',
        description: 'Send an email via Mail.app',
        category: 'Mail',
        inputSchema: {
          to: z.string().email(),
          subject: z.string(),
          body: z.string(),
        },
      },
      async (args) => {
        // Your tool implementation
        return {
          content: [{ type: 'text', text: 'Email sent!' }],
        };
      },
    );
  },
} as AppPlugin;
```

#### Step 3: Configure Plugin Discovery Path

When running from JSR, set the environment variable to point to your plugin directory:

**In Beyond Better:**
1. Open BB Settings → MCP Servers
2. Edit the AppleScript server configuration
3. Add environment variable:
   - Key: `PLUGINS_DISCOVERY_PATHS`
   - Value: `/Users/yourname/my-applescript-plugins`

**In Claude Desktop:**

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

#### Step 4: Restart and Verify

Restart the MCP client and check the logs. You should see:

```
📦 AppleScript MCP Server Runtime Info:
   Import URL: https://jsr.io/@beyondbetter/bb-applescript-mcp-server/...
   Running from JSR: Yes
   Plugin loading: Static only
🌐 Running from JSR - built-in plugins loaded statically
   User plugins can be added via PLUGINS_DISCOVERY_PATHS environment variable

DependencyHelper: Registering static plugins...
  - standard-tools
  - bbedit

DependencyHelper: Discovering plugins...
  - Searching: /Users/yourname/my-applescript-plugins
  - Found: mail-tools

DependencyHelper: Plugin registration complete
  - Total plugins: 3
  - Static plugins: 2
  - Discovered plugins: 1
```

### When Running Locally

When running from a local repository, you can add plugins to the `server/src/plugins/` directory or use `PLUGINS_DISCOVERY_PATHS` to load from external directories.

## Configuration

### Environment Variables

You can control plugin loading via environment variables:

```bash
# Disable automatic plugin discovery
PLUGINS_AUTOLOAD=false

# Set custom plugin discovery paths (works in both JSR and local modes)
PLUGINS_DISCOVERY_PATHS=./plugins,./custom-plugins,/absolute/path/to/plugins

# Allow/block specific plugins
PLUGINS_ALLOWED=standard-tools,bbedit,my-custom-plugin
PLUGINS_BLOCKED=experimental-plugin
```

### Config File

In `.env` or via ConfigManager:

```env
PLUGINS_AUTOLOAD=true
PLUGINS_DISCOVERY_PATHS=./plugins
PLUGINS_WATCH_CHANGES=false
```

## Testing

### Test Local Mode

```bash
# Run locally - should use dynamic discovery
deno task start
```

Expected output:
```
📦 AppleScript MCP Server Runtime Info:
   Import URL: file:///path/to/project/server/main.ts
   Running from JSR: No
   Plugin loading: Dynamic discovery + Static
💻 Running locally - enabling dynamic plugin discovery
```

### Test JSR Mode

```bash
# Run from JSR
deno run --allow-all jsr:@beyondbetter/bb-applescript-mcp-server
```

Expected output:
```
📦 AppleScript MCP Server Runtime Info:
   Import URL: https://jsr.io/@beyondbetter/bb-applescript-mcp-server/...
   Running from JSR: Yes
   Plugin loading: Static only
🌐 Running from JSR - using static plugin registration
```

## Benefits

1. **Works in both environments**: JSR and local development
2. **No configuration needed**: Automatic detection and adaptation
3. **Development friendly**: Dynamic discovery works locally for faster iteration
4. **Production ready**: Static loading ensures reliability in JSR deployments
5. **Explicit control**: Can still use environment variables to customize behavior

## Comparison with Other Approaches

### ❌ Dynamic Loading Only

```typescript
// This fails when running from JSR
const pluginManager = new PluginManager(/* ... */);
await pluginManager.discoverPlugins(); // Error: Cannot read JSR directories
```

### ❌ Manual Plugin Registration

```typescript
// This works but is tedious and error-prone
toolRegistry.registerTool(/* tool 1 */);
toolRegistry.registerTool(/* tool 2 */);
// ... hundreds of lines of registration code
```

### ✅ Hybrid Approach (Our Solution)

```typescript
// This works everywhere and requires minimal code
const dependencies = await createAppleScriptDependencies();
const appServer = await AppServer.create(config, dependencies);
```

## Related Files

- `server/src/dependencyHelper.ts` - Main implementation
- `server/main.ts` - Entry point using the helper
- `server/src/plugins/*/plugin.ts` - Plugin implementations
- `bb-mcp-server/src/lib/server/DependencyHelpers.ts` - Library support for static plugins
- `bb-mcp-server/src/lib/plugins/PluginManager.ts` - Plugin discovery and loading

## Future Enhancements

1. **Plugin Metadata**: Add version compatibility checks
2. **Lazy Loading**: Load plugins on-demand for faster startup
3. **Remote Plugins**: Support loading plugins from URLs
4. **Plugin Dependencies**: Handle inter-plugin dependencies
5. **Hot Reload**: Reload plugins without server restart (development mode only)