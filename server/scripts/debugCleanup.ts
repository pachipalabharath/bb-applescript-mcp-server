/**
 * Utility for cleaning up old debug scripts
 * Can be run as a standalone script or imported
 */

import { walk } from 'jsr:@std/fs@^1.0.16';
import type { Logger } from '@beyondbetter/bb-mcp-server';

export interface CleanupOptions {
	/** Directory containing debug files */
	debugDir: string;
	/** Maximum age in days for files to keep */
	maxAgeDays: number;
	/** Whether to actually delete files (false for dry run) */
	execute: boolean;
	/** Logger instance */
	logger?: Logger;
}

export interface CleanupResult {
	/** Number of files found */
	found: number;
	/** Number of files deleted */
	deleted: number;
	/** Number of bytes freed */
	bytesFreed: number;
	/** List of deleted file paths */
	deletedFiles: string[];
}

/**
 * Clean up old debug script files
 */
export async function cleanupDebugFiles(options: CleanupOptions): Promise<CleanupResult> {
	const result: CleanupResult = {
		found: 0,
		deleted: 0,
		bytesFreed: 0,
		deletedFiles: [],
	};

	const { debugDir, maxAgeDays, execute, logger } = options;

	// Check if directory exists
	try {
		const stat = await Deno.stat(debugDir);
		if (!stat.isDirectory) {
			logger?.warn(`${debugDir} is not a directory`);
			return result;
		}
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			logger?.info(`Debug directory ${debugDir} does not exist`);
			return result;
		}
		throw error;
	}

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

	logger?.info(`Cleaning up debug files older than ${cutoffDate.toISOString()}`, {
		debugDir,
		maxAgeDays,
		execute,
	});

	// Walk through all files in debug directory
	for await (const entry of walk(debugDir, { includeFiles: true, includeDirs: false })) {
		try {
			result.found++;

			// Get file info
			const stat = await Deno.stat(entry.path);
			const mtime = stat.mtime || new Date(0);

			// Check if file is old enough to delete
			if (mtime < cutoffDate) {
				const size = stat.size || 0;

				if (execute) {
					try {
						await Deno.remove(entry.path);
						result.deleted++;
						result.bytesFreed += size;
						result.deletedFiles.push(entry.path);
						logger?.debug(`Deleted ${entry.path}`);
					} catch (error) {
						logger?.warn(`Failed to delete ${entry.path}:`, error);
					}
				} else {
					// Dry run
					result.deleted++;
					result.bytesFreed += size;
					result.deletedFiles.push(entry.path);
					logger?.debug(`Would delete ${entry.path} (${size} bytes)`);
				}
			}
		} catch (error) {
			logger?.warn(`Error processing ${entry.path}:`, error);
		}
	}

	logger?.info('Cleanup complete', {
		found: result.found,
		deleted: result.deleted,
		bytesFreed: result.bytesFreed,
	});

	return result;
}

/**
 * CLI entry point
 */
if (import.meta.main) {
	const args = Deno.args;
	const debugDir = args[0] || './debug/applescript';
	const maxAgeDays = args[1] ? parseInt(args[1], 10) : 7;
	const execute = args.includes('--execute');

	console.log('Debug Script Cleanup Utility');
	console.log('============================');
	console.log(`Directory: ${debugDir}`);
	console.log(`Max age: ${maxAgeDays} days`);
	console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}`);
	console.log('');

	const logger = {
		info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
		debug: (msg: string, ...args: any[]) => console.log(`[DEBUG] ${msg}`, ...args),
		warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
		error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
	};

	try {
		const result = await cleanupDebugFiles({
			debugDir,
			maxAgeDays,
			execute,
			logger,
		});

		console.log('');
		console.log('Results:');
		console.log(`  Files found: ${result.found}`);
		console.log(`  Files ${execute ? 'deleted' : 'to delete'}: ${result.deleted}`);
		console.log(`  Space ${execute ? 'freed' : 'to free'}: ${(result.bytesFreed / 1024).toFixed(2)} KB`);

		if (!execute && result.deleted > 0) {
			console.log('');
			console.log('This was a dry run. Add --execute to actually delete files.');
		}
	} catch (error) {
		console.error('Error during cleanup:', error);
		Deno.exit(1);
	}
}
