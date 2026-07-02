import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join, relative, resolve, sep } from 'path';

const DEFAULT_FAILURE_TAIL_LINES = 40;
/**
 * Cap for the one-time --context buffered dump and for the `last` command;
 * more generous than DEFAULT_FAILURE_TAIL_LINES since both are explicit
 * "show me more" cases.
 */
export const DEFAULT_MAX_OUTPUT_LINES = 200;

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
	contextLines: number | null;
	all: boolean;
};

export function toCommandResult(lines: string[], exitCode = 0): CommandResult {
	return { output: lines.join('\n'), exitCode };
}

export function printProgress(line: string): void {
	process.stdout.write(`${line}\n`);
}

export type ParsedGlobalOptions = {
	positionals: string[];
	tailLines: number | null;
	grepPattern: string | null;
	contextLines: number | null;
	all: boolean;
};

/**
 * Parses the global --tail/--grep/--context/--all flags out of the raw CLI
 * args, returning the remaining positionals plus a FAIL CommandResult for
 * any invalid combination (missing/invalid values, or --context without
 * --grep, since context is meaningless without a pattern to expand around).
 */
export function parseGlobalOptions(
	args: string[],
): ParsedGlobalOptions | CommandResult {
	const positionals: string[] = [];
	let tailLines: number | null = null;
	let grepPattern: string | null = null;
	let contextLines: number | null = null;
	let all = false;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i]!;
		if (arg === '--tail') {
			const raw = args[i + 1];
			if (!raw) {
				return toCommandResult(['FAIL --tail requires a numeric value'], 1);
			}
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				return toCommandResult([`FAIL invalid --tail value: ${raw}`], 1);
			}
			tailLines = parsed;
			i += 1;
			continue;
		}
		if (arg === '--grep') {
			const raw = args[i + 1];
			if (!raw) {
				return toCommandResult(['FAIL --grep requires a regex pattern'], 1);
			}
			try {
				new RegExp(raw);
			} catch {
				return toCommandResult([`FAIL invalid --grep pattern: ${raw}`], 1);
			}
			grepPattern = raw;
			i += 1;
			continue;
		}
		if (arg === '--context') {
			const raw = args[i + 1];
			if (!raw) {
				return toCommandResult(['FAIL --context requires a numeric value'], 1);
			}
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed < 0) {
				return toCommandResult([`FAIL invalid --context value: ${raw}`], 1);
			}
			contextLines = parsed;
			i += 1;
			continue;
		}
		if (arg === '--all') {
			all = true;
			continue;
		}
		positionals.push(arg);
	}

	if (contextLines !== null && grepPattern === null) {
		return toCommandResult(['FAIL --context requires --grep'], 1);
	}

	return { positionals, tailLines, grepPattern, contextLines, all };
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
	contextLines,
	all,
}: {
	root: string;
	verbose: boolean;
	tailLines: number | null;
	grepPattern: string | null;
	contextLines: number | null;
	all: boolean;
}): ExecutionOptions {
	const grepRegex = grepPattern === null ? null : new RegExp(grepPattern);
	return {
		root,
		verbose,
		tailLines,
		grepPattern,
		grepRegex,
		contextLines,
		all,
	};
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

/**
 * Live, line-by-line streaming can't know in advance whether an upcoming
 * line will fall within a --context window, so when contextLines is set we
 * buffer the whole run and print the context-filtered result once at the
 * end instead (covering both pass and fail, since success shows no other
 * output at all in that mode).
 */
export function shouldStreamIncrementally(
	execOptions: Pick<ExecutionOptions, 'contextLines'>,
): boolean {
	return execOptions.contextLines === null;
}

export async function run(
	command: string,
	args: string[],
	execOptions: ExecutionOptions,
	// Injectable so tests can capture output without touching the real
	// process.stdout (which is also used concurrently by the test runner's
	// own reporter during an awaited async child-process spawn).
	writeStdout: (text: string) => void = (text) => {
		process.stdout.write(text);
	},
): Promise<ScriptResult> {
	return await new Promise<ScriptResult>((resolvePromise) => {
		const start = Date.now();
		const child = spawn(command, args, {
			cwd: execOptions.root,
			env: process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		// Always (over)write the single per-repo log so `last` can retrieve
		// this run's full output later, regardless of --tail/--grep/--all.
		const logStream = createWriteStream(getLastLogPath(execOptions.root), {
			flags: 'w',
		});
		logStream.on('error', () => {
			// Best-effort capture only; never let log-file issues break a run.
		});
		let output = '';
		let pendingDisplayLine = '';

		const flushDisplay = (text: string, flushPending: boolean) => {
			if (!execOptions.verbose || !shouldStreamIncrementally(execOptions)) {
				return;
			}
			if (execOptions.grepRegex === null) {
				writeStdout(text);
				return;
			}
			pendingDisplayLine += text;
			const lines = pendingDisplayLine.split(/\r?\n/);
			pendingDisplayLine = lines.pop() ?? '';
			for (const line of lines) {
				if (execOptions.grepRegex.test(line)) {
					writeStdout(`${line}\n`);
				}
			}
			if (flushPending && pendingDisplayLine.length > 0) {
				if (execOptions.grepRegex.test(pendingDisplayLine)) {
					writeStdout(`${pendingDisplayLine}\n`);
				}
				pendingDisplayLine = '';
			}
		};

		const writeChunk = (chunk: Buffer) => {
			const text = chunk.toString('utf-8');
			output += text;
			logStream.write(text);
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
			logStream.end();
			if (execOptions.verbose && !shouldStreamIncrementally(execOptions)) {
				const buffered = postProcessOutput(output, {
					tailLines: execOptions.tailLines,
					grepRegex: execOptions.grepRegex,
					contextLines: execOptions.contextLines,
					all: execOptions.all,
					defaultCap: DEFAULT_MAX_OUTPUT_LINES,
				});
				if (buffered.excerpt) {
					writeStdout(`${buffered.excerpt}\n`);
				}
			}
			const exitCode = status ?? 1;
			resolvePromise({
				passed: exitCode === 0,
				output,
				excerpt: postProcessOutput(output, {
					tailLines: execOptions.tailLines,
					grepRegex: execOptions.grepRegex,
					contextLines: execOptions.contextLines,
					all: execOptions.all,
					defaultCap: DEFAULT_FAILURE_TAIL_LINES,
				}).excerpt,
				exitCode,
				durationMs: Date.now() - start,
			});
		});
	});
}
