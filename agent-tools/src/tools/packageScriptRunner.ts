import { resolveChangedPackages } from './packageSelection.js';
import type { CommandResult, ExecutionOptions } from './runScript.js';
import {
	hasScript,
	printProgress,
	runScript,
	toCommandResult,
} from './runScript.js';

export type PackageScriptStep = {
	script: string;
	extraArgs?: string[];
	env?: Record<string, string>;
};

export type PackageScriptStepOutcome = {
	lines: string[];
	failCount: number;
	passCount: number;
};

export function resolveChangedPackagesOrWarn():
	| CommandResult
	| { packages: string[] } {
	const packages = resolveChangedPackages();
	if (packages.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/*, modules/*, cdk, or buildcheck packages detected',
		]);
	}
	return { packages };
}

export async function runChangedPackagesOrWarn(
	run: (packages: string[]) => Promise<CommandResult>,
): Promise<CommandResult> {
	const changed = resolveChangedPackagesOrWarn();
	if ('exitCode' in changed) {
		return changed;
	}
	return await run(changed.packages);
}

export async function runPackageScriptStepWithOutcome(
	packages: string[],
	step: PackageScriptStep,
	execOptions: ExecutionOptions,
): Promise<PackageScriptStepOutcome> {
	const lines: string[] = [];
	let failCount = 0;
	let passCount = 0;
	const label = [step.script, ...(step.extraArgs ?? [])].join(' ');

	for (const pkg of packages) {
		printProgress(`PACKAGE ${pkg}`);
		if (!hasScript(pkg, step.script)) {
			const warn = `WARN ${pkg} ${step.script}: skipped (not in package.json)`;
			printProgress(warn);
			lines.push(warn);
			continue;
		}
		printProgress(`RUN  ${pkg} ${label}`);
		const result = await runScript(pkg, step.script, {
			extraArgs: step.extraArgs,
			env: step.env,
			execOptions,
		});
		const durationSeconds = Math.round(result.durationMs / 1000);
		if (result.passed) {
			printProgress(`OK   ${pkg} ${label} (${durationSeconds}s)`);
			passCount++;
		} else {
			const fail = `FAIL ${pkg} ${label} (${durationSeconds}s)`;
			printProgress(fail);
			lines.push(fail);
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			failCount++;
		}
	}

	return { lines, failCount, passCount };
}

export async function runPackageScript(
	packages: string[],
	step: PackageScriptStep,
	commandName: string,
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const outcome = await runPackageScriptStepWithOutcome(
		packages,
		step,
		execOptions,
	);
	return toCommandResult(
		[
			...outcome.lines,
			outcome.failCount === 0
				? `OK   ${commandName} complete`
				: `FAIL ${outcome.failCount} ${commandName} failure(s)`,
		],
		outcome.failCount === 0 ? 0 : 1,
	);
}
