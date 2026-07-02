import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { createWriteStream, type WriteStream } from 'fs';
import { tmpdir } from 'os';
import { join, relative, resolve, sep } from 'path';

const DEFAULT_FAILURE_TAIL_LINES = 40;

export type CommandResult = { output: string; exitCode: number };

export type ScriptResult = {
	passed: boolean;
	output: string;
	excerpt: string;
	exitCode: number;
	durationMs: number;
};

export type ExecutionOptions = {
	root: string;
	verbose: boolean;
	tailLines: number | null;
	grepPattern: string | null;
	grepRegex: RegExp | null;
	logFilePath: string | null;
	logStream: WriteStream | null;
};

export function toCommandResult(lines: string[], exitCode = 0): CommandResult {
	return { output: lines.join('\n'), exitCode };
}

export function printProgress(line: string): void {
	process.stdout.write(`${line}\n`);
}

/** Builds pnpm args for a set of packages. Pass withDependents=true (--changed) to include each package's dependents. */
export function buildPnpmArgs(
	packages: string[],
	script: string,
	extraArgs: string[] = [],
	withDependents = false,
): string[] {
	return [
		...packages.flatMap((pkg) => [
			'--filter',
			withDependents ? `...{./${pkg}}` : `./${pkg}`,
		]),
		'run',
		'--if-present',
		script,
		...extraArgs,
	];
}

export function filterLinesByPattern(
	output: string,
	grepRegex: RegExp | null,
): string {
	if (grepRegex === null) {
		return output;
	}
	return output
		.split(/\r?\n/)
		.filter((line) => grepRegex.test(line))
		.join('\n');
}

/**
 * Like filterLinesByPattern, but also keeps `contextLines` lines before and
 * after each match (like `grep -C N`). Overlapping/adjacent windows are
 * merged. A `--` separator line is inserted between non-adjacent groups of
 * kept lines, but only when contextLines > 0 (matching grep's convention of
 * never separating plain, context-free matches).
 */
export function filterLinesByPatternWithContext(
	output: string,
	grepRegex: RegExp | null,
	contextLines: number,
): string {
	if (grepRegex === null) {
		return output;
	}
	const lines = output.split(/\r?\n/);
	const keepIndices = new Set<number>();
	lines.forEach((line, i) => {
		if (grepRegex.test(line)) {
			const start = Math.max(0, i - contextLines);
			const end = Math.min(lines.length - 1, i + contextLines);
			for (let j = start; j <= end; j += 1) {
				keepIndices.add(j);
			}
		}
	});
	const sortedIndices = [...keepIndices].sort((a, b) => a - b);
	const resultLines: string[] = [];
	let previousIndex: number | null = null;
	for (const index of sortedIndices) {
		if (
			contextLines > 0 &&
			previousIndex !== null &&
			index !== previousIndex + 1
		) {
			resultLines.push('--');
		}
		resultLines.push(lines[index]!);
		previousIndex = index;
	}
	return resultLines.join('\n');
}

export function createExecutionOptions({
	root,
	verbose,
	tailLines,
	grepPattern,
}: {
	root: string;
	verbose: boolean;
	tailLines: number | null;
	grepPattern: string | null;
}): ExecutionOptions {
	const grepRegex = grepPattern === null ? null : new RegExp(grepPattern);
	if (tailLines === null) {
		return {
			root,
			verbose,
			tailLines,
			grepPattern,
			grepRegex,
			logFilePath: null,
			logStream: null,
		};
	}
	const logFilePath = join(
		tmpdir(),
		`agent-tool-${Date.now()}-${process.pid}.log`,
	);
	const logStream = createWriteStream(logFilePath, { flags: 'a' });
	return {
		root,
		verbose,
		tailLines,
		grepPattern,
		grepRegex,
		logFilePath,
		logStream,
	};
}

export function closeExecutionOptions(options: ExecutionOptions): void {
	options.logStream?.end();
}

/**
 * Filters and bounds raw command output for display.
 *
 * - If `contextLines` is set, pattern filtering keeps surrounding context
 *   lines (like `grep -C`); otherwise only matching lines are kept.
 * - If `all` is true, the full (filtered) content is returned, uncapped.
 * - Otherwise an explicit `tailLines` is always honored as requested; absent
 *   that, `defaultCap` applies and `truncated` is reported true so callers
 *   can surface a notice (explicit `tailLines` never reports `truncated`,
 *   since that limit was deliberately requested).
 */
export type PostProcessResult = {
	excerpt: string;
	/** True only when defaultCap (not an explicit tailLines) reduced the output. */
	truncated: boolean;
	totalLines: number;
	keptLines: number;
};

export function postProcessOutput(
	output: string,
	options: {
		tailLines: number | null;
		grepRegex: RegExp | null;
		contextLines: number | null;
		all: boolean;
		defaultCap: number;
	},
): PostProcessResult {
	const normalized = output.trim();
	if (!normalized) {
		return { excerpt: '', truncated: false, totalLines: 0, keptLines: 0 };
	}
	const filtered =
		options.contextLines !== null
			? filterLinesByPatternWithContext(
					normalized,
					options.grepRegex,
					options.contextLines,
				)
			: filterLinesByPattern(normalized, options.grepRegex);
	if (!filtered) {
		return { excerpt: '', truncated: false, totalLines: 0, keptLines: 0 };
	}
	const lines = filtered.split(/\r?\n/);
	const totalLines = lines.length;
	if (options.all) {
		return {
			excerpt: filtered,
			truncated: false,
			totalLines,
			keptLines: totalLines,
		};
	}
	const keep = options.tailLines ?? options.defaultCap;
	if (totalLines <= keep) {
		return {
			excerpt: filtered,
			truncated: false,
			totalLines,
			keptLines: totalLines,
		};
	}
	return {
		excerpt: lines.slice(totalLines - keep).join('\n'),
		truncated: options.tailLines === null,
		totalLines,
		keptLines: keep,
	};
}

/**
 * Returns the path of the single, always-overwritten log file used to
 * capture the most recent command's full output for a given repository root
 * (read by the `last` command). The filename is derived from a hash of
 * `root` so different repositories on the same machine never share a log.
 */
export function getLastLogPath(root: string): string {
	const hash = createHash('sha256').update(root).digest('hex').slice(0, 12);
	return join(tmpdir(), `agent-tool-last-${hash}.log`);
}

/**
 * Resolves `inputPath` (relative or absolute) against `root`, validates it is
 * strictly inside the repository, and returns a repo-relative path.
 * Returns null if the path escapes the repository (e.g. via `..` or an
 * absolute path outside `root`).
 */
export function resolveRepoPath(
	root: string,
	inputPath: string,
): string | null {
	const abs = resolve(root, inputPath);
	if (!abs.startsWith(root + sep)) {
		return null;
	}
	return relative(root, abs);
}

export async function run(
	command: string,
	args: string[],
	execOptions: ExecutionOptions,
): Promise<ScriptResult> {
	return await new Promise<ScriptResult>((resolvePromise) => {
		const start = Date.now();
		const child = spawn(command, args, {
			cwd: execOptions.root,
			env: process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let output = '';
		let pendingDisplayLine = '';

		const flushDisplay = (text: string, flushPending: boolean) => {
			if (!execOptions.verbose) {
				return;
			}
			if (execOptions.grepRegex === null) {
				process.stdout.write(text);
				return;
			}
			pendingDisplayLine += text;
			const lines = pendingDisplayLine.split(/\r?\n/);
			pendingDisplayLine = lines.pop() ?? '';
			for (const line of lines) {
				if (execOptions.grepRegex.test(line)) {
					process.stdout.write(`${line}\n`);
				}
			}
			if (flushPending && pendingDisplayLine.length > 0) {
				if (execOptions.grepRegex.test(pendingDisplayLine)) {
					process.stdout.write(`${pendingDisplayLine}\n`);
				}
				pendingDisplayLine = '';
			}
		};

		const writeChunk = (chunk: Buffer) => {
			const text = chunk.toString('utf-8');
			output += text;
			execOptions.logStream?.write(text);
			flushDisplay(text, false);
		};
		child.stdout.on('data', (chunk: Buffer) => {
			writeChunk(chunk);
		});
		child.stderr.on('data', (chunk: Buffer) => {
			writeChunk(chunk);
		});
		child.on('close', (status) => {
			flushDisplay('', true);
			const exitCode = status ?? 1;
			resolvePromise({
				passed: exitCode === 0,
				output,
				excerpt: postProcessOutput(output, {
					tailLines: execOptions.tailLines,
					grepRegex: execOptions.grepRegex,
					contextLines: null,
					all: false,
					defaultCap: DEFAULT_FAILURE_TAIL_LINES,
				}).excerpt,
				exitCode,
				durationMs: Date.now() - start,
			});
		});
	});
}
