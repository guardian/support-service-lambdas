import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

export const ROOT = resolve(import.meta.dirname, '../../..');

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

export function getScriptCommand(
	target: string,
	script: string,
): string | null {
	const scripts = readPackageScripts(target);
	return scripts?.[script] ?? null;
}

export type ScriptResult = { passed: boolean; output: string };
export type RunScriptOptions = {
	extraArgs?: string[];
	timeoutSeconds?: number;
	env?: Record<string, string>;
};

export type ToolResult = { content: Array<{ type: 'text'; text: string }> };

export function toToolResult(lines: string[]): ToolResult {
	return { content: [{ type: 'text', text: lines.join('\n') }] };
}

export function runScript(
	target: string,
	script: string,
	options: RunScriptOptions = {},
): ScriptResult {
	const extraArgs = options.extraArgs ?? [];
	const args = [
		'--filter',
		`./${target}`,
		'run',
		script,
		...(extraArgs.length > 0 ? ['--', ...extraArgs] : []),
	];
	const result = spawnSync('pnpm', args, {
		cwd: ROOT,
		encoding: 'utf-8',
		env: { ...process.env, ...(options.env ?? {}) },
		timeout: options.timeoutSeconds ? options.timeoutSeconds * 1000 : undefined,
	});
	const stdout = result.stdout.trim();
	const stderr = result.stderr.trim();
	const timedOut = result.signal === 'SIGTERM' && !!options.timeoutSeconds;
	const timeoutLine = timedOut
		? `Timed out after ${options.timeoutSeconds}s`
		: '';
	const output = [timeoutLine, stdout, stderr].filter(Boolean).join('\n');
	const passed = result.status === 0;
	return { passed, output };
}
