import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-changed-files',
	'git --no-pager diff --name-only',
);
