import { validateTargetAgainstKnownTargets } from '../tools/targetValidation.js';

export type TargetValidationError = {
	target: string;
	reason: string;
};

export type ParsedTargetCommandArgs = {
	changed: boolean;
	targets: string[];
	unsupportedOptions: string[];
};

export function validateTargetArgs(
	targets: string[],
	knownTargets: ReadonlySet<string>,
): TargetValidationError[] {
	return targets.flatMap((target) => {
		const reason = validateTargetAgainstKnownTargets(target, knownTargets);
		return reason === null ? [] : [{ target, reason }];
	});
}

export function parseTargetCommandArgs(
	args: string[],
): ParsedTargetCommandArgs {
	const targets: string[] = [];
	const unsupportedOptions: string[] = [];
	let changed = false;

	for (const arg of args) {
		if (arg === '--changed') {
			changed = true;
			continue;
		}
		if (arg.startsWith('--')) {
			unsupportedOptions.push(arg);
			continue;
		}
		targets.push(arg);
	}

	return { changed, targets, unsupportedOptions };
}
