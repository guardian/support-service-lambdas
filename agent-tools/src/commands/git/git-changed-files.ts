import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-changed-files',
	'Git',
	'git --no-pager diff --name-only',
);
