import { gitCommand } from './git.js';

export default gitCommand('git-changed-files-staged', [
	'diff',
	'--staged',
	'--name-only',
]);
