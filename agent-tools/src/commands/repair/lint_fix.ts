import { targetStepHandler } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';

export default {
	name: 'lint_fix',
	usage: '<target...> | --changed',
	description: 'run lint --fix',
	category: 'Fix',
	handler: targetStepHandler('lint_fix', {
		script: 'lint',
		label: 'lint --fix',
		summaryLabel: 'lint_fix',
		extraArgs: ['--fix'],
	}),
} satisfies CommandDefinition;
