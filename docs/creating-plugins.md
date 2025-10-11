# Creating AppleScript MCP Plugins

A step-by-step guide to creating your own plugins for the AppleScript MCP server.

## Overview

Plugins allow you to add new tools that interact with macOS applications via AppleScript. Each plugin:
- Lives in its own directory under `src/plugins/`
- Has a `plugin.ts` file that registers tools
- Can include AppleScript files in a `scripts/` subdirectory
- Is automatically discovered and loaded by the plugin system

## Plugin File Naming

The plugin system looks for these file patterns:

✅ **Valid plugin files:**
- `plugin.ts` or `plugin.js`
- `*Plugin.ts` (e.g., `MailPlugin.ts`)
- `*.plugin.ts` (e.g., `mail.plugin.ts`)

❌ **Not recognized as plugins:**
- `MailTool.ts` (individual tool files)
- `*.test.ts` or `*.spec.ts` (test files)
- Random TypeScript files

## Quick Start: Simple Plugin

Let's create a Mail.app plugin that sends emails.

### Step 1: Create Plugin Structure

```bash
mkdir -p src/plugins/mail.plugin/scripts
touch src/plugins/mail.plugin/plugin.ts
touch src/plugins/mail.plugin/scripts/send_email.applescript
```

Your directory structure should look like:
```
src/plugins/mail.plugin/
├── plugin.ts
└── scripts/
    └── send_email.applescript
```

### Step 2: Write the AppleScript

Edit `scripts/send_email.applescript`:

```applescript
-- Template variables: ${to}, ${subject}, ${body}
tell application "Mail"
    -- Create new message
    set newMessage to make new outgoing message with properties {subject:${subject}, content:${body}, visible:true}
    
    -- Add recipient
    tell newMessage
        make new to recipient with properties {address:${to}}
    end tell
    
    -- Return success (user must click Send manually for safety)
    return "{\"success\":true,\"message\":\"Email created and ready to send\"}"
end tell
```

**Key points:**
- Use `${variableName}` for template variables
- Return JSON for structured results
- The script loader automatically handles type conversion and escaping

### Step 3: Create the Plugin File

Edit `plugin.ts`:

```typescript
import {
    AppPlugin,
    ToolRegistry,
    WorkflowRegistry,
} from 'jsr:@beyondbetter/bb-mcp-server';
import { dirname, fromFileUrl } from '@std/path';
import { z } from 'zod';
import { findAndExecuteScript } from '../../utils/scriptLoader.ts';

// Get the plugin directory path
const getPluginDir = (): string => {
    const currentFileUrl = import.meta.url;
    return dirname(fromFileUrl(currentFileUrl));
};

export default {
    name: 'mail',
    version: '1.0.0',
    description: 'Tools for sending emails via Mail.app',

    workflows: [],
    tools: [],

    async initialize(
        dependencies: any,
        toolRegistry: ToolRegistry,
        workflowRegistry: WorkflowRegistry,
    ): Promise<void> {
        const logger = dependencies.logger;
        const pluginDir = getPluginDir();

        // Register the send_email tool
        toolRegistry.registerTool(
            'send_email',
            {
                title: 'Send Email',
                description: 'Create and prepare an email in Mail.app',
                category: 'Mail',
                inputSchema: {
                    to: z.string().email().describe('Recipient email address'),
                    subject: z.string().describe('Email subject'),
                    body: z.string().describe('Email body content'),
                    timeout: z.number().optional().describe('Timeout in milliseconds'),
                },
            },
            async (args) => {
                try {
                    logger.info(`Sending email to: ${args.to}`);

                    // Execute the AppleScript with template variables
                    const result = await findAndExecuteScript(
                        pluginDir,
                        'send_email',
                        {
                            to: args.to,
                            subject: args.subject,
                            body: args.body,
                        },
                        undefined,
                        args.timeout,
                        logger,
                    );

                    if (result.success) {
                        // Parse JSON result from AppleScript
                        let scriptResult;
                        try {
                            scriptResult = typeof result.result === 'string'
                                ? JSON.parse(result.result)
                                : result.result;
                        } catch {
                            scriptResult = { output: result.result };
                        }

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(
                                        {
                                            success: true,
                                            ...scriptResult,
                                            metadata: result.metadata,
                                        },
                                        null,
                                        2,
                                    ),
                                },
                            ],
                        };
                    } else {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result, null, 2),
                                },
                            ],
                            isError: true,
                        };
                    }
                } catch (error) {
                    logger.error('Failed to send email:', error);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            },
                        ],
                        isError: true,
                    };
                }
            },
        );

        logger.info('Mail plugin initialized');
    },
} as AppPlugin;
```

### Step 4: Test Your Plugin

Restart the server:

```bash
deno task dev
```

The plugin will be automatically discovered and loaded. Check the logs for:
```
Mail plugin initialized
```

Then test in Claude:
```
Send an email to test@example.com with subject "Hello" and body "Testing!"
```

## Understanding Template Variables

The `findAndExecuteScript` function automatically converts JavaScript values to AppleScript:

### String Variables
```applescript
-- Template: ${name}
-- JavaScript: { name: "John Doe" }
-- Result: "John Doe"
```

### Array Variables
```applescript
-- Template: ${recipients}
-- JavaScript: { recipients: ["alice@example.com", "bob@example.com"] }
-- Result: {"alice@example.com", "bob@example.com"}
```

### Object Variables
```applescript
-- Template: ${settings}
-- JavaScript: { settings: { theme: "dark", size: 14 } }
-- Result: {theme:"dark", size:14}
```

### Boolean and Numbers
```applescript
-- Template: ${enabled} and ${count}
-- JavaScript: { enabled: true, count: 42 }
-- Result: true and 42
```

### Null/Undefined
```applescript
-- Template: ${optional}
-- JavaScript: { optional: null }
-- Result: missing value
```

## Advanced Patterns

### Pattern 1: Multiple Tools in One Plugin

Organize tools in separate files:

```
src/plugins/mail.plugin/
├── plugin.ts
├── tools/
│   ├── sendEmail.ts
│   ├── readEmail.ts
│   └── searchEmail.ts
└── scripts/
    ├── send_email.applescript
    ├── read_email.applescript
    └── search_email.applescript
```

In `plugin.ts`:
```typescript
import { getTools as getSendEmailTools } from './tools/sendEmail.ts';
import { getTools as getReadEmailTools } from './tools/readEmail.ts';
import { getTools as getSearchEmailTools } from './tools/searchEmail.ts';

export default {
    name: 'mail',
    // ...
    async initialize(dependencies, toolRegistry, workflowRegistry) {
        const pluginDir = getPluginDir();
        
        const allTools = [
            ...getSendEmailTools(dependencies, pluginDir),
            ...getReadEmailTools(dependencies, pluginDir),
            ...getSearchEmailTools(dependencies, pluginDir),
        ];
        
        for (const tool of allTools) {
            toolRegistry.registerTool(
                tool.name,
                tool.definition,
                tool.handler,
                tool.options,
            );
        }
    }
};
```

See `src/plugins/standard.plugin/plugin.ts` for a real example.

### Pattern 2: Path Expansion

For tools that work with file paths, expand `~` to home directory:

```typescript
const expandHomePath = (path: string): string => {
    if (path.startsWith('~/')) {
        const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '';
        return path.replace(/^~/, home);
    }
    return path;
};

// Use in tool handler:
const filePath = expandHomePath(args.path);
```

See `src/plugins/bbedit.plugin/plugin.ts` for a real example.

### Pattern 3: Compiled Scripts

For better performance, use compiled `.scpt` files:

```bash
# Compile AppleScript
osacompile -o scripts/send_email.scpt scripts/send_email.applescript
```

The script loader will automatically prefer `.scpt` over `.applescript` files.

## Tool Registration Reference

### Tool Definition Structure

```typescript
toolRegistry.registerTool(
    'tool_name',              // Tool identifier (lowercase_with_underscores)
    {
        title: 'Human Readable Title',
        description: 'What this tool does',
        category: 'Plugin Name',  // Groups tools in documentation
        inputSchema: {
            // Zod schema for parameters
            param1: z.string().describe('Parameter description'),
            param2: z.number().optional().describe('Optional parameter'),
        },
    },
    async (args) => {
        // Tool handler function
        return {
            content: [{ type: 'text', text: 'Result' }],
            isError: false,  // Optional
        };
    },
);
```

### Input Schema with Zod

Common patterns:

```typescript
import { z } from 'zod';

// String
param: z.string().describe('A string parameter')

// Optional string with default
param: z.string().optional().default('default').describe('Optional with default')

// Email validation
email: z.string().email().describe('Valid email address')

// Number with constraints
count: z.number().min(1).max(100).describe('Number between 1 and 100')

// Boolean
enabled: z.boolean().describe('Enable feature')

// Enum
status: z.enum(['draft', 'sent', 'archived']).describe('Email status')

// Array of strings
tags: z.array(z.string()).describe('List of tags')

// Object
settings: z.object({
    theme: z.string(),
    size: z.number(),
}).optional().describe('Configuration settings')

// Timeout (standard pattern)
timeout: z.number().optional().describe('Timeout in milliseconds')
```

## Error Handling

The script loader returns structured errors:

```typescript
const result = await findAndExecuteScript(/*...*/);

if (!result.success) {
    // result.error contains:
    // - type: 'permission' | 'timeout' | 'script_error' | 'system_error'
    // - message: Human-readable message
    // - code: Error code
    // - hint: LLM-friendly suggestion
    // - details: Technical details
    
    return {
        content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
        }],
        isError: true,
    };
}
```

## Plugin Configuration

### Loading Specific Plugins

In `.env` or Claude Desktop config:

```bash
# Load only specific plugins
PLUGINS_ALLOWED_LIST=standard-tools,mail

# Load all except specific plugins
PLUGINS_BLOCKED_LIST=experimental
```

### Environment Variables in Plugins

Access environment variables:

```typescript
const enableDebug = Deno.env.get('MAIL_PLUGIN_DEBUG') === 'true';
const defaultSender = Deno.env.get('MAIL_DEFAULT_SENDER') || 'noreply@example.com';
```

## Testing Your Plugin

### Manual Testing

1. **Test AppleScript directly:**
   ```bash
   osascript scripts/send_email.applescript
   ```

2. **Test with template substitution:**
   ```bash
   # Edit script temporarily with actual values
   osascript -e 'tell application "Mail" to ...'
   ```

3. **Test via Claude:**
   Use natural language to invoke your tool

### Debugging Tips

1. **Enable debug logging:**
   ```bash
   LOG_LEVEL=debug deno task dev
   ```

2. **Check plugin discovery:**
   Look for log messages like:
   ```
   Checking plugin file: mail.plugin/plugin.ts
   Mail plugin initialized
   ```

3. **Inspect tool registration:**
   ```typescript
   logger.info(`Registered tool: ${toolName}`);
   ```

4. **Log template variables:**
   ```typescript
   logger.debug('Template variables:', variables);
   ```

## Common Issues

### Issue: Plugin not loading

**Solution:**
- Check file naming (`plugin.ts`, `*Plugin.ts`, or `*.plugin.ts`)
- Verify plugin is in `src/plugins/` directory
- Check for syntax errors in `plugin.ts`
- Look for initialization errors in logs

### Issue: AppleScript not found

**Solution:**
- Verify script is in `scripts/` subdirectory
- Check filename matches tool name (e.g., `send_email.applescript` for `'send_email'`)
- Use underscore not dash in script names

### Issue: Template variables not working

**Solution:**
- Use `${variableName}` syntax in AppleScript
- Pass variables as third argument to `findAndExecuteScript`
- Check for typos in variable names

### Issue: Permission errors

**Solution:**
- Run the tool once - macOS will prompt for permission
- Or manually grant in System Settings > Privacy & Security > Automation

## Complete Example: Safari Plugin

Here's a complete working plugin for Safari:

```typescript
// src/plugins/safari.plugin/plugin.ts
import {
    AppPlugin,
    ToolRegistry,
    WorkflowRegistry,
} from 'jsr:@beyondbetter/bb-mcp-server';
import { dirname, fromFileUrl } from '@std/path';
import { z } from 'zod';
import { findAndExecuteScript } from '../../utils/scriptLoader.ts';

const getPluginDir = () => dirname(fromFileUrl(import.meta.url));

export default {
    name: 'safari',
    version: '1.0.0',
    description: 'Tools for controlling Safari browser',
    workflows: [],
    tools: [],

    async initialize(dependencies, toolRegistry, workflowRegistry) {
        const logger = dependencies.logger;
        const pluginDir = getPluginDir();

        // Open URL tool
        toolRegistry.registerTool(
            'safari_open_url',
            {
                title: 'Open URL in Safari',
                description: 'Open a URL in a new Safari tab',
                category: 'Safari',
                inputSchema: {
                    url: z.string().url().describe('URL to open'),
                    newWindow: z.boolean().optional().default(false)
                        .describe('Open in new window instead of tab'),
                    timeout: z.number().optional(),
                },
            },
            async (args) => {
                try {
                    const result = await findAndExecuteScript(
                        pluginDir,
                        'open_url',
                        {
                            url: args.url,
                            newWindow: args.newWindow,
                        },
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

        // Get current tab URL
        toolRegistry.registerTool(
            'safari_get_current_url',
            {
                title: 'Get Current Safari URL',
                description: 'Get the URL of the current Safari tab',
                category: 'Safari',
                inputSchema: {
                    timeout: z.number().optional(),
                },
            },
            async (args) => {
                try {
                    const result = await findAndExecuteScript(
                        pluginDir,
                        'get_current_url',
                        {},
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

        logger.info('Safari plugin initialized');
    },
} as AppPlugin;
```

```applescript
-- src/plugins/safari.plugin/scripts/open_url.applescript
tell application "Safari"
    activate
    
    if ${newWindow} then
        make new document with properties {URL:${url}}
    else
        tell front window
            set current tab to (make new tab with properties {URL:${url}})
        end tell
    end if
    
    return "{\"success\":true,\"url\":\"" & ${url} & "\"}"
end tell
```

```applescript
-- src/plugins/safari.plugin/scripts/get_current_url.applescript
tell application "Safari"
    set currentURL to URL of front document
    return "{\"success\":true,\"url\":\"" & currentURL & "\"}"
end tell
```

## Next Steps

1. **Study existing plugins:**
   - `src/plugins/standard.plugin/` - Complex plugin with multiple tools
   - `src/plugins/bbedit.plugin/` - Plugin with path handling

2. **Read AppleScript dictionaries:**
   Use the `read_dictionary` tool to explore what's possible:
   ```
   Read the AppleScript dictionary for Mail
   ```

3. **Explore scriptable apps:**
   - Mail.app - Email management
   - Safari - Web browsing
   - Calendar - Event management
   - Notes - Note taking
   - Reminders - Task management
   - And many more!

4. **Share your plugins:**
   Consider contributing useful plugins back to the project!

## Resources

- **bb-mcp-server docs:** [Plugin System Guide](https://github.com/Beyond-Better/bb-mcp-server/blob/main/docs/plugin-system-simplified.md)
- **AppleScript Language Guide:** [Apple Developer Docs](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
- **Scriptable Apps:** Use macOS Script Editor to browse app dictionaries

---

**Happy scripting!** 🚀
