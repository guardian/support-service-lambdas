import { targetStepHandler } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';

export default {
	name: 'check_formatting',
	usage: '<target...> | --changed',
	description: 'run check-formatting',
	category: 'Verification',
	handler: targetStepHandler('check_formatting', {
		script: 'check-formatting',
		label: 'check-formatting',
		summaryLabel: 'check_formatting',
	}),
} satisfies CommandDefinition;
