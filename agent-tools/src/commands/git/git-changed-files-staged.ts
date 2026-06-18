import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-changed-files-staged',
	'git --no-pager diff --staged --name-only',
);
