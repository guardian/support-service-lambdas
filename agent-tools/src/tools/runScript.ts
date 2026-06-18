import { spawn } from 'child_process';
import {
	createWriteStream,
	existsSync,
	readFileSync,
	type WriteStream,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { z } from 'zod';

export const ROOT = resolve(import.meta.dirname, '../../..');
const DEFAULT_FAILURE_TAIL_LINES = 40;

const packageJsonSchema = z.object({
	scripts: z.record(z.string()).optional(),
});

function readPackageScripts(target: string): Record<string, string> | null {
	try {
		const pkgPath = resolve(ROOT, target, 'package.json');
		const raw: unknown = JSON.parse(readFileSync(pkgPath, 'utf-8'));
		const pkg = packageJsonSchema.parse(raw);
		return pkg.scripts ?? {};
	} catch {
		return null;
	}
}

export function targetExists(target: string): boolean {
	return existsSync(resolve(ROOT, target));
}

export function hasScript(target: string, script: string): boolean {
	const scripts = readPackageScripts(target);
	return !!scripts?.[script];
}

export function getScripts(target: string): string[] {
	const scripts = readPackageScripts(target);
	return scripts ? Object.keys(scripts).sort() : [];
}

export type CommandResult = { output: string; exitCode: number };
export type ScriptResult = {
	passed: boolean;
	output: string;
	excerpt: string;
	exitCode: number;
	durationMs: number;
};

export type RunScriptOptions = {
	extraArgs?: string[];
	timeoutSeconds?: number;
	env?: Record<string, string>;
	execOptions: ExecutionOptions;
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

export function buildPnpmRunArgs(
	target: string,
	script: string,
	extraArgs: string[] = [],
): string[] {
	return ['--filter', `./${target}`, 'run', script, ...extraArgs];
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
	if (lines.length <= keep) {
		return filtered;
	}
	return lines.slice(lines.length - keep).join('\n');
}

async function runCommand({
	command,
	args,
	cwd,
	env,
	timeoutSeconds,
	execOptions,
}: {
	command: string;
	args: string[];
	cwd: string;
	env?: Record<string, string>;
	timeoutSeconds?: number;
	execOptions: ExecutionOptions;
}): Promise<ScriptResult> {
	return await new Promise<ScriptResult>((resolvePromise) => {
		const start = Date.now();
		const child = spawn(command, args, {
			cwd,
			env: { ...process.env, ...(env ?? {}) },
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let timedOut = false;
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
		const timeoutHandle =
			timeoutSeconds === undefined
				? null
				: setTimeout(() => {
						timedOut = true;
						child.kill('SIGTERM');
					}, timeoutSeconds * 1000);
		child.on('close', (status) => {
			flushDisplay('', true);
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
			}
			if (timedOut) {
				const timeoutLine = `Timed out after ${timeoutSeconds}s`;
				output = `${output}\n${timeoutLine}`.trim();
			}
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

export async function runScript(
	target: string,
	script: string,
	options: RunScriptOptions,
): Promise<ScriptResult> {
	const extraArgs = options.extraArgs ?? [];
	const args = buildPnpmRunArgs(target, script, extraArgs);
	return await runCommand({
		command: 'pnpm',
		args,
		cwd: ROOT,
		env: options.env,
		timeoutSeconds: options.timeoutSeconds,
		execOptions: options.execOptions,
	});
}

export async function runRootCommand(
	command: string,
	args: string[],
	options: {
		timeoutSeconds?: number;
		execOptions: ExecutionOptions;
		env?: Record<string, string>;
	},
): Promise<ScriptResult> {
	return await runCommand({
		command,
		args,
		cwd: ROOT,
		env: options.env,
		timeoutSeconds: options.timeoutSeconds,
		execOptions: options.execOptions,
	});
}
