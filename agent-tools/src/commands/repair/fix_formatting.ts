import { targetStepHandler } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';

export default {
	name: 'fix_formatting',
	usage: '<target...> | --changed',
	description: 'run fix-formatting',
	category: 'Fix',
	handler: targetStepHandler('fix_formatting', {
		script: 'fix-formatting',
		label: 'fix-formatting',
		summaryLabel: 'fix_formatting',
	}),
} satisfies CommandDefinition;
