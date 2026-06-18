import { gitCommand } from './git.js';

export default gitCommand('git-diff-staged', ['diff', '--staged', '--minimal']);
