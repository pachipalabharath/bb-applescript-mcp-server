# AppleScript MCP Server Instructions

## Purpose

This MCP server enables LLM clients to interact with macOS applications through AppleScript. It provides safe, controlled execution of predefined scripts for common automation tasks, with optional support for arbitrary script execution.

## Available Tools

### AppleScript Tools

#### run_script

**Status**: Configurable (disabled by default for safety)

Execute arbitrary AppleScript code. This is a powerful tool that allows writing and running any AppleScript.

**⚠️ WARNING**: This tool is disabled by default for security. It allows execution of any AppleScript code, which could potentially be dangerous. Only enable if you trust the LLM client completely.

**Parameters**:

- `script` (required): The AppleScript code to execute
- `timeout` (optional): Timeout in milliseconds (default: 30000, max: configured max)

**Returns**: Execution result with stdout, metadata including execution time and timeout used

**Example Usage**:

```json
{
	"script": "tell application \"Finder\" to get name of startup disk",
	"timeout": 5000
}
```

**When Disabled**: The tool still appears but returns an error explaining how to enable it (`ENABLE_ARBITRARY_SCRIPTS=true`).

---

#### read_dictionary

Read the AppleScript dictionary for any application to understand its scriptable interface. Uses the `sdef` command-line tool directly for efficient dictionary retrieval.

**Parameters**:

- `application` (required): Name of the application (e.g., "BBEdit", "Finder")
  - Automatically resolved to full application path
- `mode` (optional): Output mode (default: "overview")
  - `"overview"`: Structured summary with counts (efficient for discovery)
  - `"query"`: Retrieve specific items by type and name (targeted deep-dive)
  - `"full"`: Complete dictionary with all details
- `outputFormat` (optional): Output format (default: "json")
  - `"json"`: Structured JSON data (recommended for LLM consumption)
  - `"xml"`: Raw sdef XML format
- `query` (optional): Array of items to query (required when mode is "query")
  - Format: `"type:name"` (e.g., `"class:document"`, `"command:make"`)
  - Supported types: class, command, enumeration, event
- `timeout` (optional): Timeout in milliseconds

**Returns**: Dictionary information in requested mode and format

**Example Usage**:

**Overview Mode (Discovery):**
```json
{
	"application": "BBEdit",
	"mode": "overview"
}
```
Returns structured summary organized by suites with counts:
```json
{
  "application": "BBEdit",
  "suites": [
    {
      "name": "Standard Suite",
      "classes": [{"name": "document", "properties_count": 10, "elements_count": 2}],
      "commands": [{"name": "open", "parameters_count": 3}],
      "enumerations": [{"name": "save_options", "values": ["yes", "no", "ask"]}]
    }
  ]
}
```

**Query Mode (Targeted Details):**
```json
{
	"application": "BBEdit",
	"mode": "query",
	"query": ["class:document", "command:make"],
	"outputFormat": "json"
}
```
Returns complete details for specified items including all parameters, properties, and codes.

**Full Mode (Complete Dictionary):**
```json
{
	"application": "Finder",
	"mode": "full",
	"outputFormat": "json"
}
```
Returns complete dictionary with full details for all classes, commands, enumerations, and events.

**Use Cases**:

- **Discovery**: Use overview mode to see what's available (efficient, small response)
- **Investigation**: Use query mode to get detailed info on specific classes/commands
- **Reference**: Use full mode when you need the complete dictionary
- **Integration**: Use XML output if you need the original sdef format

**Technical Notes**:

- Automatically detects and handles encoding (typically Mac Roman from sdef)
- Application names are resolved to full paths automatically
- JSON format provides structured, LLM-friendly data
- XML format preserves original sdef structure

---

#### check_applescript_permissions

Check if automation permissions are granted for specified applications.

**Parameters**:

- `applications` (optional): Array of application names to check (e.g., ["Finder", "BBEdit"])
  - If not provided, checks common applications: Finder, BBEdit, Terminal
- `timeout` (optional): Timeout in milliseconds

**Returns**: JSON object with permission status for each application

```json
{
	"hasPermissions": true,
	"applications": [
		{
			"name": "BBEdit",
			"hasPermission": true,
			"status": "authorized"
		},
		{
			"name": "Finder",
			"hasPermission": false,
			"status": "denied",
			"instructions": "Grant permission in System Settings > Privacy & Security > Automation"
		}
	]
}
```

**Use Cases**:

- Check permissions before attempting operations
- Guide users to grant necessary permissions
- Diagnose permission-related errors

---

### Finder Tools

Tools for Finder operations that don't have simple CLI equivalents.

#### set_file_label

Set the Finder label color for one or more files or folders.

**Parameters**:

- `paths` (required): Array of file/folder paths
- `labelIndex` (required): Label index number
  - 0 = None
  - 1 = Red
  - 2 = Orange
  - 3 = Yellow
  - 4 = Green
  - 5 = Blue
  - 6 = Purple
  - 7 = Gray
- `timeout` (optional): Timeout in milliseconds

**Example Usage**:

```json
{
	"paths": ["/Users/username/Documents/report.pdf"],
	"labelIndex": 4
}
```

---

#### get_file_label

Get the Finder label color for one or more files or folders.

**Parameters**:

- `paths` (required): Array of file/folder paths
- `timeout` (optional): Timeout in milliseconds

**Returns**: JSON array with label information for each file

---

#### get_file_info_extended

Get detailed information about a file including Spotlight comments, tags, label color, and other metadata.

**Parameters**:

- `path` (required): Path to file or folder
- `timeout` (optional): Timeout in milliseconds

**Returns**: JSON object with extended file information including name, size, kind, dates, label, comment, and tags

---

#### reveal_in_finder

Reveal and select one or more files or folders in Finder.

**Parameters**:

- `paths` (required): Array of file/folder paths to reveal
- `timeout` (optional): Timeout in milliseconds

**Returns**: Success message with count of revealed items

---

#### get_finder_selection

Get the currently selected items in Finder.

**Parameters**:

- `timeout` (optional): Timeout in milliseconds

**Returns**: JSON object with count and array of selected items

```json
{
	"count": 2,
	"items": [
		{
			"path": "/Users/username/file1.txt",
			"name": "file1.txt",
			"kind": "Plain Text File",
			"isFolder": false
		}
	]
}
```

---

### BBEdit Tools

Tools for creating and managing BBEdit notebooks and projects.

#### create_bbedit_notebook

Create a new BBEdit notebook with optional initial content.

**Parameters**:

- `name` (required): Name of the notebook
- `location` (optional): Directory path where notebook should be saved
  - Default: `~/Documents/BBEdit Notebooks/`
- `content` (optional): Array of content items
  - Each item has `type` ("text" or "file") and `data` (text content or file path)
- `open` (optional): Whether to open notebook after creation (default: true)
- `timeout` (optional): Timeout in milliseconds

**Returns**: JSON object with notebook name and path

**Example Usage**:

```json
{
	"name": "Project Notes",
	"content": [
		{
			"type": "text",
			"data": "Meeting notes from today..."
		}
	],
	"open": true
}
```

---

#### create_bbedit_project

Create a new BBEdit project with optional files and folders.

**Parameters**:

- `name` (required): Name of the project
- `location` (optional): Directory path where project should be saved
  - Default: `~/Documents/BBEdit Projects/`
- `items` (optional): Array of file and/or folder paths to add to the project
- `settings` (optional): Project settings (reserved for future use)
  - `useGit`: Enable Git integration
- `open` (optional): Whether to open project after creation (default: true)
- `timeout` (optional): Timeout in milliseconds

**Returns**: JSON object with project name and path

**Example Usage**:

```json
{
	"name": "Website Project",
	"location": "/Users/username/Projects/",
	"items": [
		"/Users/username/Projects/website/src",
		"/Users/username/Projects/website/docs"
	],
	"open": true
}
```

---

## Usage Guidelines

### Best Practices

1. **Check Permissions First**: Use `check_applescript_permissions` before attempting operations on new applications
2. **Use Appropriate Timeouts**: Set realistic timeouts based on operation complexity
3. **Handle Errors Gracefully**: All tools return structured error information with hints
4. **Prefer Predefined Scripts**: Use specific tools instead of `run_script` when possible for safety
5. **Test Incrementally**: Test operations on single items before batch operations

### Error Handling

All tools return consistent error structures:

```json
{
	"success": false,
	"error": {
		"type": "permission|timeout|script_error|system_error|disabled",
		"message": "Human-readable error message",
		"code": "ERR_CODE",
		"hint": "LLM-friendly suggestion for resolution",
		"details": "Additional technical details"
	},
	"metadata": {
		"executionTime": 123,
		"scriptPath": "/path/to/script",
		"timeoutUsed": 30000
	}
}
```

### Common Error Types and Solutions

**Permission Errors** (`type: "permission"`):

- **Cause**: Automation permissions not granted
- **Solution**: Guide user to grant permissions in System Settings > Privacy & Security > Automation
- **Tool**: Use `check_applescript_permissions` to verify

**Timeout Errors** (`type: "timeout"`):

- **Cause**: Script took too long to execute
- **Solution**: Increase timeout parameter or optimize script
- **Note**: Check against maximum timeout limit in configuration

**Script Errors** (`type: "script_error"`):

- **Cause**: AppleScript syntax error or runtime error
- **Solution**: Review error message and check script syntax
- **Tool**: Use `read_dictionary` to verify correct syntax for application

**Disabled Tool** (`type: "disabled"`):

- **Cause**: Tool is disabled by configuration (applies to `run_script`)
- **Solution**: Inform user they can enable by setting `ENABLE_ARBITRARY_SCRIPTS=true`

**System Errors** (`type: "system_error"`):

- **Cause**: System-level issue (app not installed, file not found, etc.)
- **Solution**: Verify prerequisites and paths

### Timeout Configuration

- **Default Timeout**: 30 seconds (configurable via `APPLESCRIPT_TIMEOUT_DEFAULT`)
- **Maximum Timeout**: 5 minutes (configurable via `APPLESCRIPT_TIMEOUT_MAX`)
- Requested timeouts are automatically clamped to the maximum
- Always provide execution time in metadata for performance monitoring

### Plugin Configuration

Plugins can be controlled via environment variables:

- **Enable Specific Plugins**: `PLUGINS_ALLOWED_LIST=standard,bbedit`
- **Disable Specific Plugins**: `PLUGINS_BLOCKED_LIST=experimental`
- **Load All Plugins**: Leave `PLUGINS_ALLOWED_LIST` empty (default)

---

## Common Workflows

### Workflow 1: Setting Up BBEdit Project

1. Check if BBEdit is installed and has permissions:

   ```json
   {"tool": "check_applescript_permissions", "applications": ["BBEdit"]}
   ```

2. Read BBEdit dictionary to understand project commands:

   ```json
   {"tool": "read_dictionary", "application": "BBEdit", "filter": {"searchTerms": ["project"]}}
   ```

3. Create the project with files:
   ```json
   {"tool": "create_bbedit_project", "name": "My Project", "items": ["/path/to/src", "/path/to/docs"]}
   ```

### Workflow 2: Organizing Files with Labels

1. Get current Finder selection:

   ```json
   {"tool": "get_finder_selection"}
   ```

2. Set labels based on file type or other criteria:

   ```json
   {"tool": "set_file_label", "paths": ["/path/to/file.txt"], "labelIndex": 4}
   ```

3. Verify labels were set:
   ```json
   {"tool": "get_file_label", "paths": ["/path/to/file.txt"]}
   ```

### Workflow 3: Custom Automation (Advanced)

Only available when `ENABLE_ARBITRARY_SCRIPTS=true`:

1. Read dictionary to understand available commands:

   ```json
   {"tool": "read_dictionary", "application": "ApplicationName", "filter": {"format": "full"}}
   ```

2. Write and test script:

   ```json
   {
   	"tool": "run_script",
   	"script": "tell application \"ApplicationName\"\n  -- your script here\nend tell",
   	"timeout": 60000
   }
   ```

3. If successful, consider creating a permanent plugin for repeated use

---

## Security Considerations

1. **Arbitrary Script Execution**: The `run_script` tool is disabled by default. Only enable if you trust the LLM client completely.

2. **File System Access**: Scripts run with the permissions of the MCP server process. Be careful with file operations.

3. **Application Control**: Scripts can control any application the user has granted automation permissions for.

4. **Timeout Limits**: Always enforced to prevent runaway scripts. Maximum timeout is configurable.

5. **Error Information**: Error messages may contain system information. Ensure this is acceptable for your use case.

---

## Troubleshooting

### Issue: "Permission denied" errors

**Solution**:

1. Use `check_applescript_permissions` to identify which apps need permissions
2. Go to System Settings > Privacy & Security > Automation
3. Enable automation for the MCP server to control the target application
4. Retry the operation

### Issue: "run_script tool is disabled"

**Solution**:

1. This is intentional for security
2. To enable: Set `ENABLE_ARBITRARY_SCRIPTS=true` in `.env`
3. Restart the MCP server
4. Be aware of security implications

### Issue: Scripts timing out

**Solution**:

1. Increase the `timeout` parameter in the tool call
2. Check if operation is actually slow or stuck
3. Consider breaking complex operations into multiple tool calls
4. Verify the maximum timeout hasn't been reached

### Issue: Application not responding

**Solution**:

1. Check if the application is running
2. Some operations require the app to be open
3. Try opening the application manually first
4. Check for permission dialogs that may be blocking

### Issue: Script errors with complex data

**Solution**:

1. Verify JSON structure for arrays and objects
2. Check that paths are absolute and valid
3. Use `read_dictionary` to verify correct syntax
4. Test with simpler data first

---

## Technical Notes

### Script Execution

- Scripts are executed using `osascript` command
- Compiled scripts (`.scpt`) run directly for better performance
- Template scripts (`.applescript` with `${var}` markers) are compiled on-demand
- All scripts have timeout protection
- stdout and stderr are captured separately

### Template Variables

Template scripts support JavaScript-style interpolation:

- Strings: Automatically escaped for AppleScript
- Arrays: Converted to AppleScript lists: `{"item1", "item2"}`
- Objects: Converted to AppleScript records: `{key1:"value1", key2:"value2"}`
- Special values: `null`/`undefined` → `missing value`

### Performance

- Compiled scripts (`.scpt`) are faster than source scripts
- Template scripts have compilation overhead
- Consider caching for frequently-used operations
- Use appropriate timeouts to balance responsiveness and success rates

---

This MCP server provides safe, controlled access to macOS automation through AppleScript while maintaining security through configurable permissions and predefined scripts.
