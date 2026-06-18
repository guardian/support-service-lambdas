import gitChangedFilesStagedCommand from './git/git-changed-files-staged.js';
import gitChangedFilesCommand from './git/git-changed-files.js';
import gitDiffStagedStatCommand from './git/git-diff-staged-stat.js';
import gitDiffStagedCommand from './git/git-diff-staged.js';
import gitDiffStatCommand from './git/git-diff-stat.js';
import gitDiffTargetStatCommand from './git/git-diff-target-stat.js';
import gitDiffTargetCommand from './git/git-diff-target.js';
import gitDiffCommand from './git/git-diff.js';
import gitStatusCommand from './git/git-status.js';
import { makeHelpCommand } from './help.js';
import installWorkspaceCommand from './install-workspace.js';
import listTargetsCommand from './list-targets.js';
import fixFormattingCommand from './repair/fix-formatting.js';
import lintFixCommand from './repair/lint-fix.js';
import showTargetScriptsCommand from './show-target-scripts.js';
import snapshotUpdateCommand from './snapshot-update.js';
import testCommand from './test.js';
import type { CommandCategory, CommandDefinition } from './types.js';
import validateTargetsCommand from './validate-targets.js';
import checkFormattingCommand from './verify/check-formatting.js';
import lintCommand from './verify/lint.js';
import typeCheckCommand from './verify/type-check.js';

export const categoryOrder: CommandCategory[] = [
	'Utility',
	'Verification',
	'Fix',
	'Test',
	'Workspace',
	'Git',
];

// All commands except help — help closes over this array so it appears in its own output
export const commandDefinitions: CommandDefinition[] = [
	listTargetsCommand,
	validateTargetsCommand,
	showTargetScriptsCommand,
	checkFormattingCommand,
	lintCommand,
	typeCheckCommand,
	fixFormattingCommand,
	lintFixCommand,
	testCommand,
	snapshotUpdateCommand,
	installWorkspaceCommand,
	gitStatusCommand,
	gitDiffCommand,
	gitDiffTargetCommand,
	gitDiffStagedCommand,
	gitDiffStatCommand,
	gitDiffTargetStatCommand,
	gitDiffStagedStatCommand,
	gitChangedFilesCommand,
	gitChangedFilesStagedCommand,
];

// Help is added last and closes over the array — by the time its handler is called
// the array is fully populated, so help lists itself in its own output
commandDefinitions.push(makeHelpCommand(commandDefinitions, categoryOrder));

const seenNames = new Set<string>();
for (const definition of commandDefinitions) {
	if (seenNames.has(definition.name)) {
		throw new Error(`Duplicate command name in registry: ${definition.name}`);
	}
	seenNames.add(definition.name);
}
