import { fail } from '../cli/commandArgs.js';
import { toCommandResult } from '../tools/runScript.js';
import { listTargetNames } from '../tools/targetRegistry.js';
import { validateTargetAgainstKnownTargets } from '../tools/targetValidation.js';
import type { CommandDefinition } from './types.js';

function validateTargetsTool(targets: string[]) {
	const knownTargets = new Set(listTargetNames());
	const results = targets.map((target) => {
		const reason = validateTargetAgainstKnownTargets(target, knownTargets);
		return reason ? { target, valid: false, reason } : { target, valid: true };
	});
	const lines = results.map((result) =>
		result.valid
			? `OK   ${result.target}`
			: `FAIL ${result.target}: ${result.reason}`,
	);
	const failCount = results.filter((result) => !result.valid).length;
	lines.push('');
	lines.push(
		failCount === 0
			? 'OK   all targets valid'
			: `FAIL ${failCount} invalid target(s)`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

export const validateTargetsCommand: CommandDefinition = {
	name: 'validate_targets',
	usage: '<target...>',
	description: 'validate target names and formats',
	category: 'Utility',
	handler: (args) => {
		if (args.length === 0) {
			return Promise.resolve(
				fail('validate_targets requires at least one target'),
			);
		}
		return Promise.resolve(validateTargetsTool(args));
	},
};
