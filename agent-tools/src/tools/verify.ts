import {
	type CommandResult,
	type ExecutionOptions,
	hasScript,
	printProgress,
	runScript,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

const VERIFY_SCRIPT_LABELS = {
	'check-formatting': 'check_formatting',
	lint: 'lint',
	'type-check': 'type_check',
} as const;

type VerifyScript = keyof typeof VERIFY_SCRIPT_LABELS;

async function runVerifyScript(
	targets: string[],
	script: VerifyScript,
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const lines: string[] = [];
	let failCount = 0;

	for (const target of targets) {
		printProgress(`TARGET ${target}`);
		if (!hasScript(target, script)) {
			const warn = `WARN ${target} ${script}: skipped (not in package.json)`;
			printProgress(warn);
			lines.push(warn);
			continue;
		}
		printProgress(`RUN  ${target} ${script}`);
		const result = await runScript(target, script, { execOptions });
		const durationSeconds = Math.round(result.durationMs / 1000);
		if (result.passed) {
			printProgress(`OK   ${target} ${script} (${durationSeconds}s)`);
		} else {
			const fail = `FAIL ${target} ${script} (${durationSeconds}s)`;
			printProgress(fail);
			lines.push(fail);
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			failCount++;
		}
	}

	const label = VERIFY_SCRIPT_LABELS[script];
	lines.push(
		failCount === 0
			? `OK   ${label} complete`
			: `FAIL ${failCount} ${label} check(s) failed`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

function changedTargetsResult(): CommandResult | { targets: string[] } {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return { targets };
}

export async function runVerify(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const checks: VerifyScript[] = ['check-formatting', 'lint', 'type-check'];
	const lines: string[] = [];
	let failedChecks = 0;
	for (const check of checks) {
		const result = await runVerifyScript(targets, check, execOptions);
		if (result.output) {
			lines.push(result.output);
		}
		if (result.exitCode !== 0) {
			failedChecks += 1;
		}
	}
	lines.push(
		failedChecks === 0
			? 'OK   verify complete'
			: `FAIL ${failedChecks} verify stage(s) failed`,
	);
	return toCommandResult(lines, failedChecks === 0 ? 0 : 1);
}

export async function runVerifyChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const changed = changedTargetsResult();
	if ('exitCode' in changed) {
		return changed;
	}
	return await runVerify(changed.targets, execOptions);
}

export async function runCheckFormatting(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runVerifyScript(targets, 'check-formatting', execOptions);
}

export async function runLint(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runVerifyScript(targets, 'lint', execOptions);
}

export async function runTypeCheck(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runVerifyScript(targets, 'type-check', execOptions);
}

export async function runCheckFormattingChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const changed = changedTargetsResult();
	if ('exitCode' in changed) {
		return changed;
	}
	return await runCheckFormatting(changed.targets, execOptions);
}

export async function runLintChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const changed = changedTargetsResult();
	if ('exitCode' in changed) {
		return changed;
	}
	return await runLint(changed.targets, execOptions);
}

export async function runTypeCheckChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const changed = changedTargetsResult();
	if ('exitCode' in changed) {
		return changed;
	}
	return await runTypeCheck(changed.targets, execOptions);
}
