# AppleScript Debug Guide

This guide explains how to debug AppleScript compilation and execution issues in the MCP AppleScript server.

## Quick Start

To enable debugging, add these environment variables to your `server/.env` file:

```bash
DEBUG_APPLESCRIPT=true
DEBUG_APPLESCRIPT_SAVE_ALL=false
DEBUG_APPLESCRIPT_DIR=./debug/applescript
DEBUG_APPLESCRIPT_CONTEXT=5
```

## Features

### 1. Enhanced Error Messages

When a script fails to compile or execute, you'll see:

- **Error line number** extracted from compilation errors
- **Contextual code** showing lines around the error (±5 lines by default)
- **Clear markers** pointing to the problematic line
- **Debug file path** where the full script was saved (if debug mode enabled)

**Example error output:**

```
{
  "success": false,
  "error": {
    "type": "script_error",
    "message": "Compilation failed: Expected end of line but found identifier. (-2741)",
    "code": "ERR_COMPILE",
    "hint": "There is a syntax error in the AppleScript. Check the script for proper AppleScript syntax.",
    "details": "/var/folders/.../temp.applescript:50: error: Expected end of line...

Script context:
      45 | tell application \"BBEdit\"
      46 |   set notebookName to \"My Notebook\"
      47 |   try
      48 |     set nb to notebook notebookName
      49 |   on error
 >>>   50 |     make new notebook with properties {name:notebookName
      51 |   end try
      52 | end tell

Debug script saved to: ./debug/applescript/2025-10-09T08-30-15-123Z_failed.applescript"
  },
  "metadata": {
    "executionTime": 133.11,
    "timeoutUsed": 30000
  }
}
```

### 2. Script Preservation

When `DEBUG_APPLESCRIPT=true`, rendered scripts are saved to the debug directory with:

- **Timestamp** for easy identification
- **Status** (success or failed) in the filename
- **Script content** (`.applescript` file)
- **Metadata** (`.json` file) including execution results

**File naming format:**
```
2025-10-09T08-30-15-123Z_failed.applescript
2025-10-09T08-30-15-123Z_failed.json
```

### 3. Configurable Context

Control how much code context is shown around errors:

```bash
# Show ±5 lines around errors (default)
DEBUG_APPLESCRIPT_CONTEXT=5

# Show more context
DEBUG_APPLESCRIPT_CONTEXT=10

# Disable context (only show error message)
DEBUG_APPLESCRIPT_CONTEXT=0
```

## Configuration Options

### DEBUG_APPLESCRIPT

- **Type:** Boolean (`true` or `false`)
- **Default:** `false`
- **Description:** Master switch for debug mode. When enabled, scripts are saved to the debug directory.

### DEBUG_APPLESCRIPT_SAVE_ALL

- **Type:** Boolean (`true` or `false`)
- **Default:** `false`
- **Description:** When `true`, saves both successful and failed scripts. When `false`, only saves failed scripts.

**Recommended:** Keep this `false` to save disk space. Only enable when you need to inspect successful script execution.

### DEBUG_APPLESCRIPT_DIR

- **Type:** String (directory path)
- **Default:** `./debug/applescript`
- **Description:** Directory where debug scripts are saved. Created automatically if it doesn't exist.

### DEBUG_APPLESCRIPT_CONTEXT

- **Type:** Number (lines)
- **Default:** `5`
- **Description:** Number of lines to show before and after an error line in compilation errors. Set to `0` to disable context.

## Debug Workflow

### For Development

1. **Enable debug mode** in `server/.env`:
   ```bash
   DEBUG_APPLESCRIPT=true
   DEBUG_APPLESCRIPT_SAVE_ALL=false
   ```

2. **Run your script** and check the error output

3. **Inspect the saved script** if needed:
   ```bash
   cat debug/applescript/2025-10-09T08-30-15-123Z_failed.applescript
   ```

4. **Test manually** if needed:
   ```bash
   osascript debug/applescript/2025-10-09T08-30-15-123Z_failed.applescript
   ```

5. **Fix the issue** in your template or script logic

### For Production

1. **Keep debug mode disabled** for performance:
   ```bash
   DEBUG_APPLESCRIPT=false
   ```

2. **Rely on error context** in error messages (always enabled)

3. **Enable temporarily** if you need to debug a production issue:
   ```bash
   # Temporarily enable
   DEBUG_APPLESCRIPT=true
   
   # Reproduce the issue
   # Inspect saved scripts
   
   # Disable again
   DEBUG_APPLESCRIPT=false
   ```

## Cleaning Up Debug Files

Debug scripts can accumulate over time. Use the cleanup utility to remove old files:

### Dry Run (preview what would be deleted)

```bash
cd server
deno run --allow-read --allow-write src/utils/debugCleanup.ts ./debug/applescript 7
```

### Execute Cleanup

```bash
cd server
deno run --allow-read --allow-write src/utils/debugCleanup.ts ./debug/applescript 7 --execute
```

### Parameters

- **Argument 1:** Debug directory path (default: `./debug/applescript`)
- **Argument 2:** Max age in days (default: `7`)
- **Flag:** `--execute` to actually delete files (omit for dry run)

**Examples:**

```bash
# Delete files older than 30 days
deno run --allow-read --allow-write src/utils/debugCleanup.ts ./debug/applescript 30 --execute

# Preview deletion of files older than 3 days
deno run --allow-read --allow-write src/utils/debugCleanup.ts ./debug/applescript 3

# Use default settings (7 days, dry run)
deno run --allow-read --allow-write src/utils/debugCleanup.ts
```

## Common Issues

### Issue: Variable Interpolation Errors

**Symptoms:** Compilation errors like "Expected end of line but found identifier"

**Cause:** Usually incorrect string escaping or object-to-AppleScript conversion

**Debug steps:**
1. Check the saved script in the debug directory
2. Look at the error line and surrounding context
3. Verify that:
   - Strings are properly quoted and escaped
   - Arrays are converted to AppleScript lists `{item1, item2}`
   - Objects are converted to AppleScript records `{key1:value1, key2:value2}`

**Solution:** Review your template rendering logic in `server/src/utils/templateRenderer.ts`

### Issue: Runtime Errors

**Symptoms:** Script compiles but fails during execution

**Cause:** Logic errors, missing resources, permission issues

**Debug steps:**
1. Check the saved script if `DEBUG_APPLESCRIPT=true`
2. Run the script manually with `osascript` to see the full error
3. Add logging to your script
4. Verify permissions with the `check_applescript_permissions` tool

### Issue: Debug Directory Not Created

**Symptoms:** Error about missing debug directory

**Cause:** Insufficient permissions or invalid path

**Solution:** 
- Ensure the server has write permissions
- Use an absolute path or ensure the relative path is correct
- The directory will be created automatically if permissions allow

## Best Practices

1. **Keep debug mode off by default** - Enable only when needed
2. **Use context in development** - Set `DEBUG_APPLESCRIPT_CONTEXT=10` for more detail
3. **Clean up regularly** - Run the cleanup utility weekly
4. **Save only failures** - Keep `DEBUG_APPLESCRIPT_SAVE_ALL=false` unless debugging successful runs
5. **Check saved scripts** - Always inspect the actual rendered script when debugging
6. **Test manually** - Run saved scripts with `osascript` to isolate issues

## Integration with Template Renderer

The debug features work automatically with the template renderer:

```typescript
import { renderTemplate } from './utils/templateRenderer.ts';
import { compileAndRun } from './utils/scriptRunner.ts';

// Render template
const script = renderTemplate(templateString, variables);

// Run with automatic debug support
const result = await compileAndRun(script, timeout, logger);

// If debug mode is enabled and script fails:
// - Error context is added to result.error.details
// - Script is saved to debug directory
// - File path is added to error message
```

## See Also

- [Template Renderer Documentation](./server/src/utils/templateRenderer.ts)
- [Error Handler Documentation](./server/src/utils/errorHandler.ts)
- [Script Runner Documentation](./server/src/utils/scriptRunner.ts)
