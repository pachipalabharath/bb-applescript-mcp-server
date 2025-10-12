# JSR Deployment Guide

## Overview

This package implements a **hybrid deployment strategy** that supports both:
- **Local development**: Uses file-based AppleScript files (`.applescript` and `.scpt`)
- **JSR deployment**: Uses inlined scripts embedded in TypeScript modules

## Architecture

### Problem

JSR only serves TypeScript/JavaScript modules via HTTPS URLs. It does NOT serve companion assets like:
- `.applescript` files
- `.scpt` compiled scripts  
- Images or other binary files

When running from JSR, `import.meta.url` returns an `https://` URL, making filesystem operations impossible.

### Solution

We use a **build-time inlining strategy with automatic fallback**:

1. **Build Script** (`scripts/inline-applescripts.ts`):
   - Walks through all plugin directories
   - Finds all `.applescript` and `.scpt` files
   - Generates `scripts/index.ts` in each plugin with inlined content:
     - `.applescript` files → Plain text strings
     - `.scpt` files → Base64-encoded binary data

2. **Unified Script Loader** (`scriptLoader.ts`):
   - **Single loader with automatic detection**
   - Tries to import `scripts/index.ts` first (JSR mode)
   - Falls back to file-based loading if import fails (local mode)
   - No explicit JSR detection needed in plugin code

3. **Clean Plugin Code**:
   - Plugins simply call `findAndExecuteScript()`
   - Loader handles JSR vs local transparently
   - No dual code paths or conditional logic

## Deployment Workflow

### GitHub Actions Workflow

The `.github/workflows/publish.yaml` includes:

```yaml
- name: Build for JSR (inline AppleScript files)
  run: deno task build:jsr

- name: Publish package
  run: npx jsr publish
```

### Manual Publishing

```bash
# 1. Run the build script to inline AppleScripts
deno task build:jsr

# 2. Verify generated files
ls server/src/plugins/*/scripts/index.ts

# 3. Publish to JSR
npx jsr publish
```

## Testing

### Test Locally (File-based)

```bash
deno task start
# or
deno run --allow-all --unstable-kv ./server/main.ts
```

### Test from JSR (Inlined)

```bash
# After publishing to JSR
deno run --allow-all --unstable-kv jsr:@beyondbetter/bb-applescript-mcp-server@latest
```

## File Structure

```
server/src/plugins/
  standard.plugin/
    scripts/
      index.ts                    # Generated (gitignored)
      check_permissions.applescript
      finder/
        get_selection.applescript
        reveal_in_finder.applescript
        ...
    plugin.ts                     # Detects JSR vs local
    tools/
      checkPermissions.ts         # Supports both modes
      finderTools.ts              # Supports both modes
  
  bbedit.plugin/
    scripts/
      index.ts                    # Generated (gitignored)
      create_notebook.applescript
      create_project.applescript
    plugin.ts                     # Detects JSR vs local
```

## Generated Code Example

```typescript
// server/src/plugins/standard.plugin/scripts/index.ts (generated)
export interface InlinedScript {
  type: 'text' | 'binary';
  content: string;
}

export const INLINED_SCRIPTS: Record<string, InlinedScript> = {
  'check_permissions.applescript': {
    type: 'text',
    content: `-- AppleScript content here`,
  },
  'finder/get_selection.applescript': {
    type: 'text',
    content: `tell application "Finder"...`,
  },
  'compiled_script.scpt': {
    type: 'binary',
    content: 'YnBsaXN0MDDUAQIDBAUGBwpYJHZlcn...', // base64
  },
};
```

## Runtime Behavior

### Unified Approach (Both JSR and Local)

```typescript
// Plugin initialization - same for both JSR and local!
const pluginDir = getPluginDir();

// Tool execution - automatic detection
const result = await findAndExecuteScript(
  pluginDir,
  'check_permissions',
  variables,
  args,
);

// Inside scriptLoader.ts:
async function findAndExecuteScript(pluginDir, scriptName, ...) {
  // Try inlined scripts first (exists only after build:jsr)
  const inlinedScripts = await tryLoadInlinedScripts(pluginDir);
  
  if (inlinedScripts) {
    // JSR mode: Use inlined scripts
    return executeFromInlinedScripts(scriptName, inlinedScripts, ...);
  }
  
  // Local mode: Fall back to file-based loading
  const scriptPath = await findScriptInPlugin(pluginDir, scriptName);
  return loadAndExecuteScript(scriptPath, ...);
}
```

**Key Benefits:**
- Same code works in both environments
- Presence of `scripts/index.ts` is the signal
- No conditional logic in plugins
- Graceful degradation

## Important Notes

### For Contributors

1. **Never commit generated files**: `scripts/index.ts` files are gitignored
2. **Edit source files only**: Modify `.applescript` and `.scpt` files directly
3. **Rebuild before publishing**: Always run `deno task build:jsr` before JSR publish
4. **Test both modes**: Verify locally and from JSR after changes

### For Users

- **JSR installation** works out of the box - scripts are pre-inlined during publish
- **Local development** requires checking out the repository (scripts/ directory needed)
- **Custom plugins** can be added via `PLUGINS_DISCOVERY_PATHS` environment variable in both modes

## Troubleshooting

### Build Script Issues

```bash
# Check if build script can find plugins
deno run --allow-read scripts/inline-applescripts.ts

# Common issue: No scripts found
# Solution: Verify scripts exist in server/src/plugins/*/scripts/
```

### JSR Runtime Issues

```bash
# Check if running from JSR
import.meta.url  # Should start with https://jsr.io/

# Common error: "scripts/index.ts not found"
# Solution: Run deno task build:jsr before publishing
```

### Type Checking

```bash
# Verify all types are correct
deno task tool:check

# Note: server/scripts/debugCleanup.ts may have unrelated type errors
```

## Assets and Binary Files

The same inlining strategy can be applied to other assets:

- **Images**: Inline as base64 data URIs
- **JSON/YAML**: Inline as strings or import directly  
- **Compiled binaries**: Inline as base64 (like `.scpt` files)

JSR has the same limitations for all non-JS/TS assets.
