import { targetStepCommand } from '../stepCommand.js';

export default targetStepCommand('lint-fix', 'Fix', {
	script: 'lint',
	label: 'lint --fix',
	extraArgs: ['--fix'],
});
