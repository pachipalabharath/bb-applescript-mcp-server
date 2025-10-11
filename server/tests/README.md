# Test Suite

This directory contains the test suite for the AppleScript MCP Server.

## Running Tests

From the project root:

```bash
# Run all tests
deno task test

# Run tests with coverage
deno task tool:test

# Run a specific test file
deno task tool:test:file server/tests/utils/templateRenderer.test.ts
```

## Test Organization

### `utils/` - Utility Tests

Tests for core utility functions that don't require actual AppleScript execution:

- **`templateRenderer.test.ts`** - Template rendering and escaping
  - String escaping for AppleScript
  - Array to AppleScript list conversion
  - Object to AppleScript record conversion
  - Tagged template literal function
  - Template variable rendering

- **`errorHandler.test.ts`** - Error parsing and result creation
  - Error type detection (permission, timeout, script_error, system_error)
  - Error message extraction
  - Error hint generation
  - Result object creation (success and error)

- **`scriptRunner.test.ts`** - Configuration and timeout validation
  - Timeout validation and clamping
  - Environment variable parsing
  - Debug configuration

## Test Coverage

The current test suite focuses on **pure functions** and **configuration logic** that can be tested without:
- Executing actual AppleScript code
- Requiring macOS-specific APIs
- Needing external applications (BBEdit, Finder, etc.)

### What's Tested ✅

- Template rendering and variable interpolation
- String escaping for AppleScript syntax
- Type conversion (JS → AppleScript)
- Error classification and parsing
- Timeout validation logic
- Environment configuration parsing

### Future Test Additions 📋

For more comprehensive testing, consider adding:

1. **Integration Tests** - Tests that execute actual AppleScript:
   - Simple script execution (e.g., "return 42")
   - Script with arguments
   - Script timeout behavior
   - Error handling for real script failures

2. **Plugin Tests** - Tests for plugin loading and initialization:
   - Plugin discovery
   - Tool registration
   - Plugin lifecycle

3. **Script Loader Tests** - Tests for script file operations:
   - Script discovery in plugin directories
   - Compiled vs source script detection
   - Template-based script loading

4. **Mock-based Tests** - Tests using mocks for system interactions:
   - Mocked osascript command execution
   - Mocked file system operations
   - Simulated permission errors

## Writing New Tests

### Test File Structure

```typescript
/**
 * Tests for <module-name>
 * Brief description of what's being tested
 */

import { assertEquals, assertThrows } from '@std/assert';
import { functionToTest } from '../../src/path/to/module.ts';

Deno.test('functionName - description of test case', () => {
  const result = functionToTest(input);
  assertEquals(result, expectedOutput);
});
```

### Best Practices

1. **Descriptive Names** - Use clear, descriptive test names:
   - ✅ `escapeAppleScriptString - string with quotes`
   - ❌ `test1`

2. **Test One Thing** - Each test should verify one specific behavior

3. **Arrange-Act-Assert** - Follow the AAA pattern:
   ```typescript
   // Arrange
   const input = 'test';
   
   // Act
   const result = processInput(input);
   
   // Assert
   assertEquals(result, 'expected');
   ```

4. **Clean Up** - Tests that modify environment should restore original state:
   ```typescript
   const original = Deno.env.get('VAR');
   try {
     Deno.env.set('VAR', 'test');
     // ... test code ...
   } finally {
     if (original) {
       Deno.env.set('VAR', original);
     } else {
       Deno.env.delete('VAR');
     }
   }
   ```

## Dependencies

Tests use Deno's standard library:
- `@std/assert` - Assertion functions
- `@std/path` - Path utilities (when needed)

## Environment Variables

Some tests verify environment variable handling. The test suite cleans up after itself to avoid side effects.

Relevant environment variables:
- `APPLESCRIPT_TIMEOUT_DEFAULT` - Default timeout in milliseconds (default: 30000)
- `APPLESCRIPT_TIMEOUT_MAX` - Maximum allowed timeout (default: 300000)
- `DEBUG_APPLESCRIPT` - Enable debug mode (default: false)
- `DEBUG_APPLESCRIPT_SAVE_ALL` - Save all scripts, not just failures (default: false)
- `DEBUG_APPLESCRIPT_DIR` - Debug output directory (default: ./debug/applescript)
- `DEBUG_APPLESCRIPT_CONTEXT` - Lines of context in errors (default: 5)
