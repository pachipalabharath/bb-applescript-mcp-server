# AppleScript MCP Server

[![Beyond Better](https://img.shields.io/badge/Beyond-Better-blue?style=flat&labelColor=6FD99C&color=0C1F3E)](https://beyondbetter.app)
![MCP Server](https://img.shields.io/badge/MCP-Server-blue?style=flat&logo=modelcontextprotocol&logoSize=auto&logoColor=black&labelColor=beige)
[![MCP Server](https://img.shields.io/badge/MCP-Beyond%20Better-blue?style=flat&logo=modelcontextprotocol&logoSize=auto&logoColor=black&labelColor=beige)](https://github.com/Beyond-Better/bb-mcp-server)

[![JSR](https://jsr.io/badges/@beyondbetter/bb-applescript-mcp-server)](https://jsr.io/@beyondbetter/bb-applescript-mcp-server)
[![JSR Score](https://jsr.io/badges/@beyondbetter/bb-applescript-mcp-server/score)](https://jsr.io/@beyondbetter/bb-applescript-mcp-server)
[![JSR Scope](https://jsr.io/badges/@beyondbetter)](https://jsr.io/@beyondbetter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that enables LLM clients to interact with macOS applications through AppleScript. Built using the [@beyondbetter/bb-mcp-server](https://github.com/Beyond-Better/bb-mcp-server) library, this server provides safe, controlled execution of predefined scripts with optional support for arbitrary script execution.

## Features

- **🔒 Safe by Default**: Arbitrary script execution disabled by default
- **📦 Plugin Architecture**: Modular design with task-focused plugins
- **🛠️ Standard Tools**: Read dictionaries, check permissions, Finder operations
- **📝 BBEdit Integration**: Create notebooks and projects
- **⏱️ Timeout Protection**: Configurable timeouts with hard limits
- **📄 Structured Errors**: Consistent error handling with LLM-friendly hints
- **📊 Performance**: Support for both compiled and template-based scripts

## Prerequisites

- **Deno**: Version 2.5.0 or later
- **macOS**: Required for AppleScript execution
- **Applications**: Any macOS application that supports AppleEvents (scriptable applications)
  - Examples: Finder (built-in), BBEdit, Mail, Safari, etc.
  - This server includes plugins for Finder and BBEdit by default
  - You can create plugins for any scriptable application

## Quick Start

### Option 1: Run Directly from JSR (Recommended)

**No installation required!** Just Deno and a config file.

#### 1. Install Deno (if needed)

```bash
curl -fsSL https://deno.land/install.sh | sh
```

#### 2. Configure in Beyond Better

**Global Configuration** (applies to all projects):

1. Open BB Settings
2. Go to "MCP Servers" tab
3. Click "Configure Servers"
4. Add new server with:
   - **Server ID**: `applescript`
   - **Display Name**: `AppleScript Tools`
   - **Transport Type**: `STDIO (Local Process)`
   - **Command**: `deno`
   - **Arguments**: 
     ```
     run
     --allow-all
     --unstable-kv
     jsr:@beyondbetter/bb-applescript-mcp-server
     ```

**Project-Level Configuration** (specific project only):

1. Open your project in BB
2. Go to Project Settings → "MCP Servers"
3. Enable server for `AppleScript Tools`

#### 3. Start Using

That's it! The server runs directly from JSR with no download or installation needed.

<details>
<summary><strong>Alternative: Claude Desktop Configuration</strong></summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

#### 4. Optional: Configuration

By default, the server runs with safe defaults:
- Arbitrary script execution: **disabled**
- All standard plugins: **enabled**
- Default timeouts: **30s default, 5min max**

To customize, add environment variables in BB's MCP server configuration:

In BB Settings → MCP Servers → Edit Server → Environment Variables:

| Key | Value | Description |
|-----|-------|-------------|
| `LOG_LEVEL` | `info` | Set to `debug` for detailed logs |
| `ENABLE_ARBITRARY_SCRIPTS` | `false` | Set to `true` to enable run_script tool |
| `PLUGINS_ALLOWED_LIST` | (empty) | Comma-separated list to load specific plugins |
| `PLUGINS_BLOCKED_LIST` | (empty) | Comma-separated list to block plugins |

### Option 2: Run from Local Repository

For development or customization:

#### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/bb-mcp-applescript.git
cd bb-mcp-applescript/server

# Copy environment template
cp .env.example .env
```

#### 2. Configure Environment

Edit `.env` to customize:

```bash
# Basic Configuration
MCP_TRANSPORT=stdio
LOG_LEVEL=info

# Plugin Control
PLUGINS_ALLOWED_LIST=        # Empty = load all plugins
PLUGINS_BLOCKED_LIST=        # Block specific plugins

# Safety (IMPORTANT)
ENABLE_ARBITRARY_SCRIPTS=false  # Set to true to enable run_script tool

# Timeouts
APPLESCRIPT_TIMEOUT_DEFAULT=30000   # 30 seconds
APPLESCRIPT_TIMEOUT_MAX=300000      # 5 minutes
```

#### 3. Run the Server

```bash
# Development mode (with auto-reload)
deno task dev

# Production mode
deno task start
```

#### 4. Configure in Beyond Better

**Global Configuration:**

1. Open BB Settings (or Project Settings)
2. Go to "MCP Servers" tab
3. Add new server:
   - **Server ID**: `applescript`
   - **Display Name**: `AppleScript Tools (Local Dev)`
   - **Transport Type**: `STDIO (Local Process)`
   - **Command**: `deno`
   - **Arguments**:
     ```
     run
     --allow-all
     --unstable-kv
     /absolute/path/to/bb-mcp-applescript/server/main.ts
     ```
   - **Environment Variables** (optional):
     - `LOG_LEVEL`: `debug`
     - `ENABLE_ARBITRARY_SCRIPTS`: `false`

<details>
<summary><strong>Alternative: Claude Desktop Configuration</strong></summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"applescript": {
			"command": "deno",
			"args": [
				"run",
				"--allow-all",
				"--unstable-kv",
				"/absolute/path/to/bb-mcp-applescript/server/main.ts"
			]
		}
	}
}
```

Restart Claude Desktop.
</details>

## Project Structure

```
server/
├── main.ts                          # Server entry point
├── deno.jsonc                       # Deno configuration
├── .env.example                     # Environment template
├── mcp_server_instructions.md       # LLM context/instructions
├── src/
│   ├── plugins/
│   │   ├── standard.plugin/         # Standard tools plugin
│   │   │   ├── plugin.ts            # Plugin implementation
│   │   │   └── scripts/             # AppleScript files
│   │   │       ├── read_dictionary.applescript
│   │   │       ├── check_permissions.applescript
│   │   │       └── finder/
│   │   │           ├── set_file_label.applescript
│   │   │           ├── get_file_label.applescript
│   │   │           ├── get_file_info_extended.applescript
│   │   │           ├── reveal_in_finder.applescript
│   │   │           └── get_selection.applescript
│   │   └── bbedit.plugin/           # BBEdit tools plugin
│   │       ├── plugin.ts
│   │       └── scripts/
│   │           ├── create_notebook.applescript
│   │           └── create_project.applescript
│   └── utils/
│       ├── scriptLoader.ts          # Script loading/discovery
│       ├── scriptRunner.ts          # Script execution
│       ├── templateRenderer.ts      # Template interpolation
│       └── errorHandler.ts          # Error standardization
└── tests/
```

## Available Tools

### AppleScript Tools (Standard Plugin)

#### 🔧 run_script

**Status**: 🔒 Disabled by default

Execute arbitrary AppleScript code.

**Enable**: Set `ENABLE_ARBITRARY_SCRIPTS=true` in `.env`

**Parameters**:

- `script`: AppleScript code to execute
- `timeout`: Optional timeout in milliseconds

**Example**:

```javascript
{
  script: 'tell application "Finder" to get name of startup disk',
  timeout: 5000
}
```

#### 📖 read_dictionary

Read an application's AppleScript dictionary to understand its scriptable interface.

**Parameters**:

- `application`: Application name (e.g., "BBEdit", "Finder")
- `filter`: Optional filter criteria
  - `include.types`: Array of types to include
  - `include.names`: Specific names to include
  - `searchTerms`: Terms for fuzzy matching
  - `format`: "full" or "summary" (default: "summary")
- `timeout`: Optional timeout

**Example**:

```javascript
{
  application: "BBEdit",
  filter: {
    include: { names: ["project", "notebook"] },
    searchTerms: ["create"],
    format: "summary"
  }
}
```

#### ✅ check_applescript_permissions

Check automation permissions for applications.

**Parameters**:

- `applications`: Optional array of app names (default: ["Finder", "BBEdit", "Terminal"])
- `timeout`: Optional timeout

**Returns**: Permission status for each application with instructions if needed.

### Finder Tools (Standard Plugin)

#### 🏷️ set_file_label

Set Finder label colors for files/folders.

**Parameters**:

- `paths`: Array of file/folder paths
- `labelIndex`: 0=None, 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue, 6=Purple, 7=Gray
- `timeout`: Optional timeout

#### 🏷️ get_file_label

Get Finder label colors for files/folders.

**Parameters**:

- `paths`: Array of file/folder paths
- `timeout`: Optional timeout

#### 📊 get_file_info_extended

Get detailed file information including Spotlight comments, tags, labels, etc.

**Parameters**:

- `path`: File or folder path
- `timeout`: Optional timeout

#### 🔍 reveal_in_finder

Reveal and select files/folders in Finder.

**Parameters**:

- `paths`: Array of paths to reveal
- `timeout`: Optional timeout

#### 📋 get_finder_selection

Get currently selected items in Finder.

**Parameters**:

- `timeout`: Optional timeout

### BBEdit Tools (BBEdit Plugin)

#### 📓 create_bbedit_notebook

Create a new BBEdit notebook.

**Parameters**:

- `name`: Notebook name (required)
- `location`: Optional save location (default: ~/Documents/BBEdit Notebooks/)
- `content`: Optional array of content items
  - `type`: "text" or "file"
  - `data`: Text content or file path
- `open`: Whether to open after creation (default: true)
- `timeout`: Optional timeout

**Example**:

```javascript
{
  name: "Project Notes",
  content: [
    { type: "text", data: "Meeting notes..." },
    { type: "file", data: "/path/to/notes.txt" }
  ],
  open: true
}
```

#### 📁 create_bbedit_project

Create a new BBEdit project.

**Parameters**:

- `name`: Project name (required)
- `location`: Optional save location (default: ~/Documents/BBEdit Projects/)
- `items`: Optional array of file/folder paths to add
- `settings`: Optional project settings (reserved for future)
- `open`: Whether to open after creation (default: true)
- `timeout`: Optional timeout

**Example**:

```javascript
{
  name: "Website Project",
  items: [
    "/Users/username/Projects/website/src",
    "/Users/username/Projects/website/docs"
  ],
  open: true
}
```

## Plugin Management

### Plugin Loading Strategy

This server uses a **hybrid plugin loading approach** that automatically adapts to the runtime environment:

- **JSR Mode**: When running from JSR (e.g., `jsr:@beyondbetter/bb-applescript-mcp-server`):
  - Built-in plugins (standard-tools, bbedit) are statically loaded
  - User plugins can be loaded from local directories via `PLUGINS_DISCOVERY_PATHS`
  - Allows users to extend the server with custom plugins

- **Local Mode**: When running from a local directory:
  - Built-in plugins are statically loaded as fallback
  - Dynamic discovery enabled by default
  - Hot-reload support during development

The server automatically detects which mode it's running in and configures plugin loading appropriately. No configuration is needed - it just works!

**📖 For technical details**, see [Plugin Loading Documentation](docs/PLUGIN_LOADING.md)

#### Adding Custom Plugins

You can add your own plugins even when running from JSR:

1. Create a plugin directory: `mkdir ~/my-applescript-plugins`
2. Add your plugin files (see [plugin guide](docs/creating-plugins.md))
3. Set environment variable: `PLUGINS_DISCOVERY_PATHS=/path/to/your/plugins`
4. Restart the server

Your custom plugins will be discovered and loaded alongside the built-in plugins.

### Loading Plugins

Plugins are auto-discovered from `src/plugins/` directory (local mode) or statically loaded (JSR mode).

**Load all plugins** (default):

```bash
PLUGINS_ALLOWED_LIST=
PLUGINS_BLOCKED_LIST=
```

**Load specific plugins only**:

```bash
PLUGINS_ALLOWED_LIST=standard,bbedit
PLUGINS_BLOCKED_LIST=
```

**Load all except specific plugins**:

```bash
PLUGINS_ALLOWED_LIST=
PLUGINS_BLOCKED_LIST=experimental
```

### Creating Custom Plugins

Plugins allow you to add tools for any scriptable macOS application. See the complete guide:

**📝 [Creating Plugins Guide](docs/creating-plugins.md)**

Quick example for a Mail.app plugin:

```typescript
// src/plugins/mail.plugin/plugin.ts
import { AppPlugin, ToolRegistry, z } from 'jsr:@beyondbetter/bb-mcp-server';
import { findAndExecuteScript } from '../../utils/scriptLoader.ts';

export default {
	name: 'mail',
	version: '1.0.0',
	description: 'Tools for Mail.app',
	workflows: [],
	tools: [],

	async initialize(dependencies, toolRegistry, workflowRegistry) {
		const pluginDir = getPluginDir();
		
		toolRegistry.registerTool(
			'send_email',
			{
				title: 'Send Email',
				description: 'Create an email in Mail.app',
				category: 'Mail',
				inputSchema: {
					to: z.string().email().describe('Recipient'),
					subject: z.string().describe('Subject'),
					body: z.string().describe('Body'),
				},
			},
			async (args) => {
				// Runs scripts/send_email.applescript with template variables
				return await findAndExecuteScript(
					pluginDir,
					'send_email',
					{ to: args.to, subject: args.subject, body: args.body }
				);
			},
		);
	},
} as AppPlugin;
```

The guide covers:
- Plugin structure and file naming
- AppleScript template variables
- Multiple tools per plugin
- Error handling and debugging
- Complete working examples

## Script Development

### Template Scripts

Use template variables in `.applescript` files:

```applescript
-- my_script.applescript
tell application "Finder"
    set file label of (POSIX file ${filePath} as alias) to ${labelIndex}
end tell
```

Variables are automatically escaped and type-converted:

- **Strings**: Wrapped in quotes, escaped
- **Arrays**: Converted to AppleScript lists: `{"item1", "item2"}`
- **Objects**: Converted to AppleScript records: `{key:"value"}`
- **null/undefined**: Converted to `missing value`

### Compiled Scripts

For better performance, use compiled scripts:

```bash
# Compile an AppleScript
osacompile -o my_script.scpt my_script.applescript
```

Compiled scripts run directly without compilation overhead.

## Error Handling

All tools return consistent error structures:

```json
{
	"success": false,
	"error": {
		"type": "permission|timeout|script_error|system_error|disabled",
		"message": "Human-readable error",
		"code": "ERR_CODE",
		"hint": "LLM-friendly suggestion",
		"details": "Technical details"
	},
	"metadata": {
		"executionTime": 123,
		"scriptPath": "/path/to/script",
		"timeoutUsed": 30000
	}
}
```

### Common Issues

#### Permission Denied

**Solution**: Grant automation permissions

1. Use `check_applescript_permissions` to identify which apps need permissions
2. Go to System Settings > Privacy & Security > Automation
3. Enable automation for the MCP server process

#### Script Timeouts

**Solution**: Increase timeout or optimize script

- Set higher `timeout` parameter
- Check `APPLESCRIPT_TIMEOUT_MAX` configuration
- Break complex operations into smaller scripts

#### run_script Disabled

**Solution**: Enable in configuration

- Set `ENABLE_ARBITRARY_SCRIPTS=true` in `.env`
- Restart server
- Be aware of security implications

## Security Considerations

1. **🔒 Arbitrary Scripts**: Disabled by default. Only enable if you trust the LLM client.
2. **📁 File System**: Scripts run with server process permissions.
3. **🎯 Application Control**: Can control any app with granted automation permissions.
4. **⏱️ Timeout Limits**: Always enforced to prevent runaway scripts.
5. **📝 Error Details**: May contain system information. Review error output.

## Performance Tips

- Use **compiled scripts** (`.scpt`) for frequently-used operations
- Set **appropriate timeouts** based on operation complexity
- **Batch operations** when possible (e.g., multiple files at once)
- **Cache results** for read-only operations (e.g., dictionary reads)

## Testing

```bash
# Run tests
deno task test

# Run specific test file
deno test tests/scriptRunner.test.ts
```

## Contributing

This is a showcase example for the [@beyondbetter/bb-mcp-server](https://github.com/Beyond-Better/bb-mcp-server) library.

Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Related Projects

- **[bb-mcp-server](https://github.com/Beyond-Better/bb-mcp-server)**: The MCP server library powering this project
- **[Model Context Protocol](https://modelcontextprotocol.io/)**: The protocol specification

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/bb-mcp-applescript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/bb-mcp-applescript/discussions)
- **Library Docs**: [bb-mcp-server Documentation](https://github.com/Beyond-Better/bb-mcp-server)

---

**Built with [@beyondbetter/bb-mcp-server](https://github.com/Beyond-Better/bb-mcp-server)** - A powerful framework for building MCP servers with plugins, workflows, and OAuth support.
