import { gitCommand } from './git.js';

export default gitCommand('git-diff-staged-stat', [
	'diff',
	'--staged',
	'--stat',
]);
