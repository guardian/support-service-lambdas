import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-status',
	'Git',
	'git --no-pager status --short',
);
