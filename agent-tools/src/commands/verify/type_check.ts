import { targetStepHandler } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';

export default {
	name: 'type_check',
	usage: '<target...> | --changed',
	description: 'run type-check',
	category: 'Verification',
	handler: targetStepHandler('type_check', {
		script: 'type-check',
		label: 'type-check',
		summaryLabel: 'type_check',
	}),
} satisfies CommandDefinition;
