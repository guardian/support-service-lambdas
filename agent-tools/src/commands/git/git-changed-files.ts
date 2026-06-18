import { gitCommand } from './git.js';

export default gitCommand('git-changed-files', ['diff', '--name-only']);
