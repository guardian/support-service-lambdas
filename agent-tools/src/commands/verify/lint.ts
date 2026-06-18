import { targetStepHandler } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';

export default {
	name: 'lint',
	usage: '<target...> | --changed',
	description: 'run lint',
	category: 'Verification',
	handler: targetStepHandler('lint', {
		script: 'lint',
		label: 'lint',
		summaryLabel: 'lint',
	}),
} satisfies CommandDefinition;
