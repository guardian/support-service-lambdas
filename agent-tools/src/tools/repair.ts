import {
	type CommandResult,
	type ExecutionOptions,
	hasScript,
	printProgress,
	runScript,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

function changedTargetsResult(): CommandResult | { targets: string[] } {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return { targets };
}

async function runStep(
	targets: string[],
	step: {
		script: 'fix-formatting' | 'lint';
		extraArgs: string[];
		label: string;
	},
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const lines: string[] = [];
	let failCount = 0;

	for (const target of targets) {
		printProgress(`TARGET ${target}`);
		if (!hasScript(target, step.script)) {
			const warn = `WARN ${target} ${step.script}: skipped (not in package.json)`;
			printProgress(warn);
			lines.push(warn);
			continue;
		}
		printProgress(`RUN  ${target} ${step.label}`);
		const result = await runScript(target, step.script, {
			extraArgs: step.extraArgs,
			execOptions,
		});
		const durationSeconds = Math.round(result.durationMs / 1000);
		if (result.passed) {
			printProgress(`OK   ${target} ${step.label} (${durationSeconds}s)`);
		} else {
			const fail = `FAIL ${target} ${step.label} (${durationSeconds}s)`;
			printProgress(fail);
			lines.push(fail);
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			failCount++;
		}
	}

	lines.push(
		failCount === 0
			? `OK   ${step.label.replaceAll(' ', '_')} complete`
			: `FAIL ${failCount} ${step.label.replaceAll(' ', '_')} step(s) failed`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

export async function runFixFormatting(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runStep(
		targets,
		{ script: 'fix-formatting', extraArgs: [], label: 'fix-formatting' },
		execOptions,
	);
}

export async function runLintFix(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runStep(
		targets,
		{ script: 'lint', extraArgs: ['--fix'], label: 'lint --fix' },
		execOptions,
	);
}

export async function runFixFormattingChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const changed = changedTargetsResult();
	if ('exitCode' in changed) {
		return changed;
	}
	return await runFixFormatting(changed.targets, execOptions);
}

export async function runLintFixChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const changed = changedTargetsResult();
	if ('exitCode' in changed) {
		return changed;
	}
	return await runLintFix(changed.targets, execOptions);
}
