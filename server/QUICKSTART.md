# Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites Check

```bash
# Check Deno version (need 2.5.0+)
deno --version

# If not installed:
curl -fsSL https://deno.land/install.sh | sh
```

### 2. Environment Setup

```bash
cd server
cp .env.example .env
```

Edit `.env` if you want to customize (defaults are fine for testing):

```bash
# Optional: Enable dangerous run_script tool
# ENABLE_ARBITRARY_SCRIPTS=true

# Optional: Adjust timeouts
# APPLESCRIPT_TIMEOUT_DEFAULT=30000
# APPLESCRIPT_TIMEOUT_MAX=300000
```

### 3. Run the Server

```bash
# Start server
deno task start

# Or for development with auto-reload:
deno task dev
```

### 4. Configure Claude Desktop

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
				"/FULL/PATH/TO/bb-mcp-applescript/server/main.ts"
			]
		}
	}
}
```

**Important**: Use the FULL absolute path!

Restart Claude Desktop.

### 5. Test It!

In Claude, try these commands:

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

## Common Issues

### Issue: Server won't start

**Check:**
```bash
# Verify Deno version
deno --version  # Should be 2.5.0+

# Check for errors
deno task start
```

**Solution**: Update Deno if needed

### Issue: Claude doesn't see the tools

**Check:**
1. Is the path in `claude_desktop_config.json` absolute?
2. Did you restart Claude Desktop after editing config?
3. Is the server running? (Check terminal output)

**Solution**: 
```bash
# Get absolute path
pwd
# Use that in config with /main.ts at the end
```

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
1. Create a new plugin in `src/plugins/myplugin.plugin/`
2. Add AppleScript files to `scripts/` subdirectory
3. Implement plugin interface in `plugin.ts`
4. Restart server - plugin auto-discovered!

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
          timeout: z.number().optional()
        }
      },
      async (args) => {
        try {
          const result = await findAndExecuteScript(
            pluginDir,
            'send_email',
            args,  // Template variables
            undefined,
            args.timeout,
            logger
          );
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }],
            isError: !result.success
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${error.message}`
            }],
            isError: true
          };
        }
      }
    );
  }
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
{ timeout: 5000 }  // 5 seconds

// Complex operation  
{ timeout: 60000 }  // 1 minute

// Very slow operation
{ timeout: 120000 }  // 2 minutes (if MAX allows)
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
