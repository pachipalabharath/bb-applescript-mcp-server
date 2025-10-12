# Plugin Examples

This directory contains example plugins that demonstrate how to extend the AppleScript MCP Server with custom functionality.

## User Plugin Example

**File**: `user-plugin-example.ts`

A complete example of a Mail.app plugin that shows how users can create custom plugins that work with the AppleScript MCP Server, even when running from JSR.

### What It Demonstrates

- ✅ Plugin structure and exports
- ✅ Tool registration with Zod schemas
- ✅ AppleScript execution
- ✅ Error handling
- ✅ Logging integration
- ✅ Multiple tools in one plugin

### Tools Provided

1. **send_email** - Send emails via Mail.app
   - Parameters: to, subject, body, cc (optional), attachments (optional)
   - Creates and sends an email

2. **check_unread_mail** - Check unread email count
   - Parameters: mailbox (optional, default: INBOX)
   - Returns count of unread emails

### How to Use This Example

#### Step 1: Copy the Example

```bash
# Create your plugins directory
mkdir -p ~/my-applescript-plugins

# Copy the example
cp docs/examples/user-plugin-example.ts ~/my-applescript-plugins/mail.plugin.ts
```

#### Step 2: Configure the Server

**When running from JSR:**

Set the `PLUGINS_DISCOVERY_PATHS` environment variable to your plugins directory.

**In Beyond Better:**
1. Settings → MCP Servers → Edit AppleScript server
2. Add environment variable:
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
        "PLUGINS_DISCOVERY_PATHS": "/Users/yourname/my-applescript-plugins"
      }
    }
  }
}
```

**When running locally:**

Copy to the server's plugin directory:

```bash
cp docs/examples/user-plugin-example.ts server/src/plugins/mail.plugin/plugin.ts
```

#### Step 3: Restart and Test

Restart your MCP client and the new tools should be available:

- `send_email` - Send an email
- `check_unread_mail` - Check unread count

### Expected Output

When the server starts, you should see:

```
📦 AppleScript MCP Server Runtime Info:
   Import URL: https://jsr.io/@beyondbetter/bb-applescript-mcp-server/...
   Running from JSR: Yes
🌐 Running from JSR - built-in plugins loaded statically
   User plugins can be added via PLUGINS_DISCOVERY_PATHS environment variable

DependencyHelper: Registering static plugins...
  - standard-tools (2 tools)
  - bbedit (2 tools)

DependencyHelper: Discovering plugins...
  - Searching: /Users/yourname/my-applescript-plugins
  - Found plugin: mail.plugin.ts

Mail Tools plugin initialized
  - send_email
  - check_unread_mail

DependencyHelper: Plugin registration complete
  - Total plugins: 3
  - Static plugins: 2 (standard-tools, bbedit)
  - Discovered plugins: 1 (mail-tools)
  - Total tools: 11
```

## Creating Your Own Plugins

Use the example as a template:

1. **Name your file** following the pattern: `your-plugin.plugin.ts` or `plugin.ts`

2. **Import required types**:
   ```typescript
   import type { AppPlugin, ToolRegistry, WorkflowRegistry } from 'jsr:@beyondbetter/bb-mcp-server';
   import { z } from 'npm:zod@^3.22.4';
   ```

3. **Export default object** with:
   - `name` - Unique plugin identifier
   - `version` - Plugin version
   - `description` - What the plugin does
   - `workflows` - Array of workflow instances (usually empty)
   - `tools` - Array of tool registrations (usually empty)
   - `initialize()` - Async function that registers tools/workflows

4. **Register tools** in the `initialize()` function:
   ```typescript
   toolRegistry.registerTool(
     'tool_name',
     {
       title: 'Tool Title',
       description: 'What the tool does',
       category: 'Category Name',
       inputSchema: {
         param1: z.string().describe('Parameter description'),
       },
     },
     async (args) => {
       // Tool implementation
       return {
         content: [{ type: 'text', text: 'Result' }],
       };
     },
   );
   ```

5. **Execute AppleScript** using Deno.Command:
   ```typescript
   const command = new Deno.Command('osascript', {
     args: ['-e', 'your applescript here'],
   });
   const { code, stdout, stderr } = await command.output();
   ```

## Plugin Naming Conventions

For automatic discovery, name your plugin files:

- `plugin.ts` - Generic plugin file
- `*.plugin.ts` - Named plugin (e.g., `mail.plugin.ts`)
- `*Plugin.ts` - Capitalized (e.g., `MailPlugin.ts`)

All of these patterns are recognized by the plugin discovery system.

## Best Practices

1. **Error Handling**: Always catch and handle errors gracefully
2. **Logging**: Use `dependencies.logger` for consistent logging
3. **Validation**: Use Zod schemas for input validation
4. **Documentation**: Add clear descriptions for tools and parameters
5. **Return Format**: Use consistent JSON structures in responses
6. **Testing**: Test with actual AppleScript before deployment
7. **Permissions**: Document any required automation permissions

## More Examples

Want to create plugins for other applications? Check the built-in plugins:

- **Standard Plugin**: `server/src/plugins/standard.plugin/plugin.ts`
  - Dictionary reading
  - Permission checking
  - Finder operations

- **BBEdit Plugin**: `server/src/plugins/bbedit.plugin/plugin.ts`
  - Notebook creation
  - Project management

## Resources

- **[Plugin Loading Guide](../PLUGIN_LOADING.md)** - Technical details
- **[Creating Plugins Guide](../creating-plugins.md)** - Step-by-step guide
- **[README](../../README.md)** - Project overview
- **[AppleScript Language Guide](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)** - Apple's documentation

## Need Help?

- Open an issue on GitHub
- Check existing plugin implementations
- Review the bb-mcp-server documentation
