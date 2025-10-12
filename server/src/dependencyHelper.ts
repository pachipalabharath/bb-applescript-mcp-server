/**
 * Dependency Helper for AppleScript MCP Server
 *
 * Provides static plugin loading for JSR deployments and dynamic loading for local development.
 * When running from JSR, plugins must be statically imported since filesystem discovery doesn't work.
 */

import type { AppServerDependencies } from '@beyondbetter/bb-mcp-server';
import type { AppPlugin } from '@beyondbetter/bb-mcp-server';

// Static imports for JSR deployment
import standardPlugin from './plugins/standard.plugin/plugin.ts';
import bbeditPlugin from './plugins/bbedit.plugin/plugin.ts';

/**
 * Detect if the server is running from JSR or locally
 *
 * @returns true if running from JSR (https://jsr.io/...), false if running locally (file://...)
 */
export function isRunningFromJsr(): boolean {
  const importUrl = import.meta.url;

  // JSR modules are loaded via HTTPS URLs
  if (
    importUrl.startsWith('https://jsr.io/') ||
    importUrl.startsWith('https://esm.sh/jsr/')
  ) {
    return true;
  }

  // Local development uses file:// URLs
  if (importUrl.startsWith('file://')) {
    return false;
  }

  // Fallback: assume JSR if not a file URL
  // This handles other CDN formats that might be used
  return !importUrl.startsWith('file://');
}

/**
 * Get static plugins for registration
 *
 * When running from JSR, all plugins must be statically imported and registered
 * because filesystem discovery doesn't work with JSR packages.
 *
 * @returns Array of statically imported plugins
 */
export function getStaticPlugins(): AppPlugin[] {
  return [
    standardPlugin,
    bbeditPlugin,
  ];
}

/**
 * Create dependencies for the AppleScript MCP Server
 *
 * This function detects the runtime environment and provides appropriate
 * plugin configuration:
 * - JSR: Static plugins for built-in tools + user can provide custom plugins via PLUGINS_DISCOVERY_PATHS
 * - Local: Static plugins as fallback + dynamic discovery enabled by default
 *
 * In both modes, users can add their own plugins by:
 * 1. Setting PLUGINS_DISCOVERY_PATHS environment variable (e.g., "./my-plugins")
 * 2. Setting PLUGINS_AUTOLOAD=true (default)
 *
 * The built-in plugins (standard-tools, bbedit) are always available via static loading,
 * and user plugins are discovered from the filesystem.
 *
 * @returns Partial dependencies with plugin configuration
 */
export async function createAppleScriptDependencies(): Promise<Partial<AppServerDependencies>> {
  const runningFromJsr = isRunningFromJsr();

  if (runningFromJsr) {
    // JSR mode: Static plugins for built-in tools
    // User plugins can still be loaded from PLUGINS_DISCOVERY_PATHS
    console.log('🌐 Running from JSR - built-in plugins loaded statically');
    console.log('   User plugins can be added via PLUGINS_DISCOVERY_PATHS environment variable');

    return {
      staticPlugins: getStaticPlugins(),
      // Note: PluginManager will still discover user plugins from PLUGINS_DISCOVERY_PATHS
      // if PLUGINS_AUTOLOAD=true (default). This allows users to extend the server
      // with custom plugins even when running from JSR.
    };
  } else {
    // Local mode: Static plugins as fallback + dynamic discovery
    console.log(
      '💻 Running locally - built-in plugins loaded statically + dynamic discovery enabled',
    );

    return {
      // Provide static plugins as fallback
      // Dynamic discovery will add to these if enabled
      staticPlugins: getStaticPlugins(),
    };
  }
}

/**
 * Log runtime information for debugging
 */
export function logRuntimeInfo(): void {
  const runningFromJsr = isRunningFromJsr();
  const importUrl = import.meta.url;

  console.log('📦 AppleScript MCP Server Runtime Info:');
  console.log(`   Import URL: ${importUrl}`);
  console.log(`   Running from JSR: ${runningFromJsr ? 'Yes' : 'No'}`);
  console.log(
    `   Plugin loading: ${runningFromJsr ? 'Static only' : 'Dynamic discovery + Static'}`,
  );
}
