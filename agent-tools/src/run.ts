import { spawn } from 'child_process';
import { createWriteStream, type WriteStream } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

export const ROOT = resolve(import.meta.dirname, '../../..');

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

/** Builds pnpm args for explicit packages — runs only those packages, skips missing scripts. */
export function buildPnpmExplicitArgs(
	packages: string[],
	script: string,
	extraArgs: string[] = [],
): string[] {
	return [
		...packages.flatMap((pkg) => ['--filter', `./${pkg}`]),
		'run',
		'--if-present',
		script,
		...extraArgs,
	];
}

/** Builds pnpm args for changed packages — each with its dependents, skips missing scripts. */
export function buildPnpmChangedArgs(
	packages: string[],
	script: string,
	extraArgs: string[] = [],
): string[] {
	return [
		...packages.flatMap((pkg) => ['--filter', `...{./${pkg}}`]),
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

export function createExecutionOptions({
	verbose,
	tailLines,
	grepPattern,
}: {
	verbose: boolean;
	tailLines: number | null;
	grepPattern: string | null;
}): ExecutionOptions {
	const grepRegex = grepPattern === null ? null : new RegExp(grepPattern);
	if (tailLines === null) {
		return {
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
	return { verbose, tailLines, grepPattern, grepRegex, logFilePath, logStream };
}

export function closeExecutionOptions(options: ExecutionOptions): void {
	options.logStream?.end();
}

function toExcerpt(
	output: string,
	tailLines: number | null,
	grepRegex: RegExp | null,
): string {
	const normalized = output.trim();
	if (!normalized) {
		return '';
	}
	const filtered = filterLinesByPattern(normalized, grepRegex);
	if (!filtered) {
		return '';
	}
	const lines = filtered.split(/\r?\n/);
	const keep = tailLines ?? DEFAULT_FAILURE_TAIL_LINES;
	return lines.length <= keep
		? filtered
		: lines.slice(lines.length - keep).join('\n');
}

async function runCommand({
	command,
	args,
	cwd,
	execOptions,
}: {
	command: string;
	args: string[];
	cwd: string;
	execOptions: ExecutionOptions;
}): Promise<ScriptResult> {
	return await new Promise<ScriptResult>((resolvePromise) => {
		const start = Date.now();
		const child = spawn(command, args, {
			cwd,
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
				excerpt: toExcerpt(
					output,
					execOptions.tailLines,
					execOptions.grepRegex,
				),
				exitCode,
				durationMs: Date.now() - start,
			});
		});
	});
}

export async function runRootCommand(
	command: string,
	args: string[],
	execOptions: ExecutionOptions,
): Promise<ScriptResult> {
	return await runCommand({ command, args, cwd: ROOT, execOptions });
}
