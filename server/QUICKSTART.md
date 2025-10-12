# Quick Start Guide

## 2-Minute Setup (JSR)

**The easiest way!** No download, no installation, no configuration files.

**Works with any macOS application that supports AppleEvents** (scriptable applications like Finder, Mail, Safari, BBEdit, etc.). This server includes plugins for Finder and BBEdit by default.

### 1. Install Deno

```bash
# Check if you have Deno (need 2.5.0+)
deno --version

# If not installed:
curl -fsSL https://deno.land/install.sh | sh
```

### 2. Configure in Beyond Better

**Option A: Global Configuration** (all projects)

1. Open **BB Settings**
2. Navigate to **MCP Servers** tab
3. Click **Configure Servers**
4. Add server:
   - **Server ID**: `applescript`
   - **Display Name**: `AppleScript Tools`
   - **Transport**: `STDIO (Local Process)`
   - **Command**: `deno`
   - **Arguments** (one per line):
     ```
     run
     --allow-all
     --unstable-kv
     jsr:@beyondbetter/bb-applescript-mcp-server
     ```
5. Click **Save**

**Option B: Project-Level Configuration** (specific project)

1. Open your project in BB
2. Go to **Project Settings** → **MCP Servers**
3. Enable server for `AppleScript Tools`

That's it! You're done. 🎉

The server runs directly from JSR (JavaScript Registry). Nothing is downloaded or installed except what Deno caches automatically.

<details>
<summary><strong>Alternative: Claude Desktop</strong></summary>

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
      ]
    }
  }
}
```

Restart Claude Desktop.

</details>

### 3. Start Using

### 4. Test It!

In Beyond Better (or Claude), try these commands:

**Check permissions:**

```
Check what AppleScript permissions are available
```

**Get Finder selection:**

```
What files are currently selected in Finder?
```

**Read an app dictionary:**

```
Show me what BBEdit commands are available for projects
```

**Create a BBEdit notebook:**

```
Create a BBEdit notebook called "Test Notebook" with some sample text
```

## Optional: Custom Configuration

The JSR version runs with safe defaults, but you can customize using environment variables.

**In Beyond Better:**

1. Edit your server in **MCP Servers** settings
2. Add **Environment Variables**:

| Key                        | Value                   | Purpose                                 |
| -------------------------- | ----------------------- | --------------------------------------- |
| `LOG_LEVEL`                | `debug`                 | Enable detailed logging                 |
| `ENABLE_ARBITRARY_SCRIPTS` | `false`                 | Enable run_script tool (security risk!) |
| `PLUGINS_ALLOWED_LIST`     | `standard-tools,bbedit` | Load only specific plugins              |
| `PLUGINS_BLOCKED_LIST`     | `experimental`          | Block specific plugins                  |

<details>
<summary><strong>For Claude Desktop (JSON config)</strong></summary>

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
        "LOG_LEVEL": "debug",
        "ENABLE_ARBITRARY_SCRIPTS": "false",
        "PLUGINS_BLOCKED_LIST": "experimental"
      }
    }
  }
}
```

</details>

## Alternative: Local Development Setup

For plugin development or customization:

### 1. Clone Repository

```bash
git clone https://github.com/your-username/bb-mcp-applescript.git
cd bb-mcp-applescript/server
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env to customize
```

### 3. Run Locally

```bash
# Start server
deno task start

# Or with auto-reload:
deno task dev
```

### 4. Configure in Beyond Better

Add to BB Settings or Project Settings → MCP Servers:

- **Server ID**: `applescript-dev`
- **Display Name**: `AppleScript Tools (Dev)`
- **Transport**: `STDIO (Local Process)`
- **Command**: `deno`
- **Arguments**:
  ```
  run
  --allow-all
  --unstable-kv
  /FULL/PATH/TO/bb-mcp-applescript/server/main.ts
  ```
- **Environment Variables** (optional):
  - `LOG_LEVEL`: `debug`
  - `ENABLE_ARBITRARY_SCRIPTS`: `false`

<details>
<summary><strong>For Claude Desktop</strong></summary>

```json
{
  "mcpServers": {
    "applescript": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "--unstable-kv",
        "/FULL/PATH/TO/bb-mcp-applescript/server/main.ts"
      ]
    }
  }
}
```

</details>

## Common Issues

### Issue: Server won't start

**Check:**

```bash
# Verify Deno version
deno --version  # Should be 2.5.0+
```

**Solution**: Update Deno if needed

### Issue: BB/Claude doesn't see the tools

**For Beyond Better:**

1. Check that server shows "Connected" status in MCP Servers settings
2. Verify Command and Arguments are correct
3. Check BB logs for connection errors

**For Claude Desktop:**

1. Did you restart Claude Desktop after editing config?
2. Is the JSON valid? (Use a JSON validator)
3. Check Claude Desktop logs

**Solution**:

- Verify configuration is saved correctly
- Make sure you're using `jsr:@beyondbetter/bb-applescript-mcp-server`
- Check that Deno is in your PATH

### Issue: Permission errors

**Solution:**

1. Try the operation - macOS will prompt for permission
2. Or go to System Settings > Privacy & Security > Automation
3. Enable automation for Terminal (or whatever is running the server)

### Issue: "run_script is disabled"

**This is intentional!**

It's a safety feature. To enable:

1. Edit `.env`:
   ```bash
   ENABLE_ARBITRARY_SCRIPTS=true
   ```

2. Restart server

3. **Be aware**: This allows arbitrary code execution!

## What's Available?

### AppleScript Tools

- `run_script` - Run arbitrary AppleScript (disabled by default)
- `read_dictionary` - Read app scripting dictionaries
- `check_applescript_permissions` - Check automation permissions

### Finder Tools

- `set_file_label` - Set Finder label colors
- `get_file_label` - Get Finder label colors
- `get_file_info_extended` - Get detailed file info
- `reveal_in_finder` - Reveal files in Finder
- `get_finder_selection` - Get selected Finder items

### BBEdit Tools

- `create_bbedit_notebook` - Create BBEdit notebooks
- `create_bbedit_project` - Create BBEdit projects

## Next Steps

### Learn More

- Read `README.md` for detailed documentation
- Check `mcp_server_instructions.md` for LLM context
- See `PROJECT_SUMMARY.md` for architecture details

### Extend the Server

Create plugins for any scriptable macOS application!

**📝 [Complete Plugin Creation Guide](../docs/creating-plugins.md)**

Quick steps:

1. Create `src/plugins/yourapp.plugin/` directory
2. Add `plugin.ts` and `scripts/` subdirectory
3. Implement tools that call AppleScript files
4. Restart server - plugin auto-discovered!

The guide includes complete working examples for Mail.app and Safari.

### Example: Add a Mail Plugin

```bash
# Create plugin structure
mkdir -p src/plugins/mail.plugin/scripts
touch src/plugins/mail.plugin/plugin.ts
touch src/plugins/mail.plugin/scripts/send_email.applescript
```

Edit `plugin.ts`:

```typescript
import { AppPlugin, ToolRegistry, z } from 'jsr:@beyondbetter/bb-mcp-server';
import { findAndExecuteScript } from '../../utils/scriptLoader.ts';
import { dirname, fromFileUrl } from '@std/path';

const getPluginDir = () => dirname(fromFileUrl(import.meta.url));

export default {
  name: 'mail',
  version: '1.0.0',
  description: 'Tools for Mail.app',

  async initialize(dependencies, toolRegistry, workflowRegistry) {
    const logger = dependencies.logger;
    const pluginDir = getPluginDir();

    toolRegistry.registerTool(
      'send_email',
      {
        title: 'Send Email',
        description: 'Send an email via Mail.app',
        category: 'Mail',
        inputSchema: {
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject'),
          body: z.string().describe('Email body'),
          timeout: z.number().optional(),
        },
      },
      async (args) => {
        try {
          const result = await findAndExecuteScript(
            pluginDir,
            'send_email',
            args, // Template variables
            undefined,
            args.timeout,
            logger,
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2),
            }],
            isError: !result.success,
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${error.message}`,
            }],
            isError: true,
          };
        }
      },
    );
  },
} as AppPlugin;
```

Edit `scripts/send_email.applescript`:

```applescript
tell application "Mail"
    set newMessage to make new outgoing message with properties {
        subject: ${subject},
        content: ${body},
        visible: true
    }
    
    tell newMessage
        make new to recipient with properties {address: ${to}}
    end tell
    
    -- Note: User must click Send manually for safety
    return "Email created and ready to send"
end tell
```

Restart server - new tool available!

## Development Tips

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug deno task start

# Test a single script directly
osascript src/plugins/standard.plugin/scripts/check_permissions.applescript
```

### Hot Reload

```bash
# Use dev mode for auto-reload
deno task dev

# Make changes to plugins/scripts
# Server automatically restarts
```

### Testing Scripts

```bash
# Test AppleScript directly
osascript -e 'tell application "Finder" to get name of startup disk'

# Compile a script
osacompile -o test.scpt test.applescript

# Run compiled script
osascript test.scpt
```

## Tips for Writing AppleScripts

### 1. Use Template Variables

```applescript
-- DON'T do this:
-- on run argv
--   set filePath to item 1 of argv
-- end run

-- DO this instead:
tell application "Finder"
    set targetFile to POSIX file ${filePath} as alias
end tell
```

### 2. Handle Arrays Properly

```applescript
-- Template variable ${paths} becomes AppleScript list
repeat with filePath in ${paths}
    -- Process each path
end repeat
```

### 3. Return JSON for Complex Data

```applescript
-- Build JSON manually
set resultJson to "{" & ¬
    "\"success\":true," & ¬
    "\"data\":\"" & someValue & "\"" & ¬
    "}"
return resultJson
```

### 4. Error Handling

```applescript
try
    -- Your code here
on error errMsg number errNum
    return "Error (" & errNum & "): " & errMsg
end try
```

## Performance Tips

### Use Compiled Scripts

```bash
# Compile frequently-used scripts
osacompile -o scripts/frequent.scpt scripts/frequent.applescript

# 50-100ms faster execution
```

### Batch Operations

```javascript
// DON'T do this:
for (const file of files) {
  await setFileLabel([file], labelIndex);
}

// DO this instead:
await setFileLabel(files, labelIndex);
```

### Set Appropriate Timeouts

```javascript
// Quick operation
{
  timeout: 5000;
} // 5 seconds

// Complex operation
{
  timeout: 60000;
} // 1 minute

// Very slow operation
{
  timeout: 120000;
} // 2 minutes (if MAX allows)
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-username/bb-mcp-applescript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/bb-mcp-applescript/discussions)
- **Library**: [bb-mcp-server docs](https://github.com/Beyond-Better/bb-mcp-server)

## Quick Reference

### File Locations

```
Configuration:   server/.env
Main entry:      server/main.ts
Plugins:         server/src/plugins/*.plugin/
Utilities:       server/src/utils/
Instructions:    server/mcp_server_instructions.md
```

### Environment Variables

```bash
ENABLE_ARBITRARY_SCRIPTS=false   # Enable run_script
LOG_LEVEL=info                   # debug|info|warn|error
PLUGINS_ALLOWED_LIST=            # Comma-separated
PLUGINS_BLOCKED_LIST=            # Comma-separated
APPLESCRIPT_TIMEOUT_DEFAULT=30000
APPLESCRIPT_TIMEOUT_MAX=300000
```

### Useful Commands

```bash
deno task start          # Run server
deno task dev            # Run with auto-reload
deno task test           # Run tests
deno fmt                 # Format code
deno lint                # Lint code
osascript script.scpt    # Test AppleScript
osacompile -o out.scpt in.applescript  # Compile script
```

Now you're ready to use and extend the AppleScript MCP Server! 🚀
