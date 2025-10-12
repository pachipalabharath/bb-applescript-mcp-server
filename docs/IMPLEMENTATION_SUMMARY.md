# Plugin Loading Implementation Summary

## Overview

Successfully implemented a hybrid plugin loading mechanism that automatically adapts to the runtime environment (JSR vs local filesystem).

## Problem Statement

When an MCP server is run directly from JSR (e.g., `jsr:@beyondbetter/bb-applescript-mcp-server`), dynamic plugin discovery fails because:

1. JSR packages are served via HTTPS URLs, not local filesystem paths
2. `Deno.readDir()` cannot traverse remote module directories
3. Plugin files are bundled but not accessible via filesystem APIs

## Solution Implemented

### 1. Runtime Detection (`server/src/dependencyHelper.ts`)

Created a dependency helper module that:

- **Detects runtime environment** by examining `import.meta.url`
  - JSR: `https://jsr.io/...` or `https://esm.sh/jsr/...`
  - Local: `file:///...`

- **Provides static plugins** via explicit imports
  ```typescript
  import standardPlugin from './plugins/standard.plugin/plugin.ts';
  import bbeditPlugin from './plugins/bbedit.plugin/plugin.ts';
  ```

- **Adapts plugin loading strategy**
  - JSR mode: Returns `staticPlugins` array, disables discovery
  - Local mode: Returns `staticPlugins` as fallback, allows discovery

### 2. Main Entry Point (`server/main.ts`)

Updated to use the dependency helper:

```typescript
import { createAppleScriptDependencies, logRuntimeInfo } from './src/dependencyHelper.ts';

logRuntimeInfo();
const dependencies = await createAppleScriptDependencies();

const appServer = await AppServer.create({
  serverConfig: { /* ... */ },
}, dependencies);
```

### 3. Library Support (bb-mcp-server)

The bb-mcp-server library already had `staticPlugins` support:

- `AppServerDependencies.staticPlugins` - Array of pre-imported plugins
- `registerPluginsInRegistries()` - Registers static plugins before discovery
- Hybrid mode support - Both static and discovered plugins can coexist

## Files Changed

### Created Files

1. **`server/src/dependencyHelper.ts`**
   - Runtime detection logic
   - Static plugin registration
   - Dependency creation function

2. **`docs/PLUGIN_LOADING.md`**
   - Comprehensive documentation
   - Usage examples
   - Adding new plugins guide

3. **`server/tests/dependencyHelper.test.ts`**
   - Unit tests for runtime detection
   - Plugin validation tests
   - URL pattern verification

4. **`docs/IMPLEMENTATION_SUMMARY.md`** (this file)
   - Implementation overview
   - Solution summary

### Modified Files

1. **`server/main.ts`**
   - Added dependency helper imports
   - Added runtime logging
   - Passed dependencies to AppServer.create()

2. **`README.md`**
   - Added plugin loading strategy section
   - Link to detailed documentation

## Testing

All tests pass successfully:

```bash
$ deno task tool:test:file server/tests/dependencyHelper.test.ts --no-check

running 4 tests from ./server/tests/dependencyHelper.test.ts
✓ isRunningFromJsr - detects local file URLs ... ok (0ms)
✓ getStaticPlugins - returns array of plugins ... ok (0ms)
✓ getStaticPlugins - plugins have initialize method ... ok (0ms)
✓ URL detection logic - JSR patterns ... ok (0ms)

ok | 4 passed | 0 failed (276ms)
```

## How It Works

### Local Development Mode

```
📦 AppleScript MCP Server Runtime Info:
   Import URL: file:///Users/user/projects/bb-mcp-applescript/server/main.ts
   Running from JSR: No
   Plugin loading: Dynamic discovery + Static
💻 Running locally - enabling dynamic plugin discovery
```

**Behavior:**
1. Static plugins loaded first (standard-tools, bbedit)
2. Filesystem discovery runs (if `PLUGINS_AUTOLOAD=true`)
3. Any additional plugins discovered and loaded
4. Both types registered and available

### JSR Production Mode

```
📦 AppleScript MCP Server Runtime Info:
   Import URL: https://jsr.io/@beyondbetter/bb-applescript-mcp-server/0.1.0/server/main.ts
   Running from JSR: Yes
   Plugin loading: Static + User Discovery
🌐 Running from JSR - built-in plugins loaded statically
   User plugins can be added via PLUGINS_DISCOVERY_PATHS environment variable
```

**Behavior:**
1. Built-in static plugins loaded (standard-tools, bbedit)
2. User plugin discovery runs from `PLUGINS_DISCOVERY_PATHS` (if set)
3. Both built-in and user plugins available
4. Users can extend server with custom plugins

## Adding New Plugins

When adding a new plugin to the server:

### Step 1: Create Plugin File

```typescript
// server/src/plugins/my-plugin.plugin/plugin.ts
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  workflows: [],
  tools: [],
  async initialize(dependencies, toolRegistry, workflowRegistry) {
    // Register tools...
  },
} as AppPlugin;
```

### Step 2: Add Static Import

Edit `server/src/dependencyHelper.ts`:

```typescript
// Add import at top
import myPlugin from './plugins/my-plugin.plugin/plugin.ts';

// Add to getStaticPlugins()
export function getStaticPlugins(): AppPlugin[] {
  return [
    standardPlugin,
    bbeditPlugin,
    myPlugin,  // <-- Add here
  ];
}
```

### Step 3: Test

```bash
# Verify plugin loads
deno task start

# Check plugin is registered
# (plugins shown in server logs)
```

That's it! The plugin now works in both JSR and local modes.

## Benefits

### ✅ Automatic Adaptation
- No configuration needed
- Works in both environments
- No code changes for deployment

### ✅ Development Friendly
- Dynamic discovery for rapid iteration
- Hot reloading support (when enabled)
- Static plugins as safety net

### ✅ Production Ready
- Reliable static loading from JSR
- No filesystem dependencies
- Explicit plugin registration

### ✅ Maintainable
- Single dependency helper module
- Clear plugin registration pattern
- Easy to add new plugins

### ✅ Backward Compatible
- Existing plugins work unchanged
- Configuration options still respected
- Library features fully utilized

## Comparison with Other Approaches

### Approach 1: Dynamic Only (Original)

```typescript
// Fails when running from JSR
const pluginManager = new PluginManager(...);
await pluginManager.discoverPlugins(); // ❌ Error: Cannot read JSR directories
```

**Issues:**
- Doesn't work from JSR
- Requires filesystem access
- No fallback mechanism

### Approach 2: Manual Registration

```typescript
// Works but tedious
toolRegistry.registerTool('tool1', ...);
toolRegistry.registerTool('tool2', ...);
toolRegistry.registerTool('tool3', ...);
// ... hundreds of lines
```

**Issues:**
- Verbose and error-prone
- No plugin abstraction
- Difficult to maintain

### Approach 3: Hybrid (Implemented) ✅

```typescript
// Works everywhere with minimal code
const dependencies = await createAppleScriptDependencies();
const appServer = await AppServer.create(config, dependencies);
```

**Benefits:**
- Automatic environment detection
- Minimal boilerplate code
- Maintains plugin architecture
- Works in all scenarios

## Configuration Options

The plugin loading respects all existing configuration:

```bash
# Disable automatic discovery (JSR does this automatically)
PLUGINS_AUTOLOAD=false

# Custom discovery paths (local mode only)
PLUGINS_DISCOVERY_PATHS=./plugins,./custom-plugins

# Plugin filtering (works in both modes)
PLUGINS_ALLOWED=standard-tools,bbedit
PLUGINS_BLOCKED=experimental
```

## Future Enhancements

### Potential Improvements

1. **Plugin Version Compatibility**
   - Check version compatibility before loading
   - Warn about version mismatches

2. **Lazy Loading**
   - Load plugins on-demand
   - Reduce startup time

3. **Remote Plugins**
   - Support loading from URLs
   - Third-party plugin ecosystem

4. **Plugin Dependencies**
   - Handle inter-plugin dependencies
   - Dependency resolution

5. **Hot Reload**
   - Reload plugins without restart
   - Development mode only

### JSR Package Considerations

When publishing to JSR:

1. **Include all plugin files** in the package
2. **Static imports** ensure all code is bundled
3. **Environment variables** still work for configuration
4. **No filesystem operations** required for plugins

## Related Documentation

- **[Plugin Loading Details](./PLUGIN_LOADING.md)** - Comprehensive technical documentation
- **[Creating Plugins Guide](./creating-plugins.md)** - How to create custom plugins
- **[README.md](../README.md)** - Project overview and quick start

## Library References

### bb-mcp-server

- **AppServerDependencies.staticPlugins** - Interface for static plugin registration
- **PluginManager.registerPlugin()** - Registers plugins explicitly
- **registerPluginsInRegistries()** - Hybrid registration logic
  - Step 1: Register static plugins
  - Step 2: Discover filesystem plugins (if enabled)

See: `bb-mcp-server/src/lib/server/DependencyHelpers.ts`

## Conclusion

This implementation provides a **robust, flexible, and maintainable** solution for plugin loading that:

✅ Works with both JSR and local deployments
✅ Requires no configuration or code changes for different environments
✅ Maintains the benefits of the plugin architecture
✅ Provides clear patterns for adding new plugins
✅ Utilizes existing bb-mcp-server library features
✅ Includes comprehensive documentation and tests

The hybrid approach successfully solves the JSR plugin loading problem while maintaining all the benefits of dynamic discovery for local development.