import gitChangedFilesCommand from './git/git_changed_files.js';
import gitChangedFilesStagedCommand from './git/git_changed_files_staged.js';
import gitDiffCommand from './git/git_diff.js';
import gitDiffStagedCommand from './git/git_diff_staged.js';
import gitDiffStagedStatCommand from './git/git_diff_staged_stat.js';
import gitDiffStatCommand from './git/git_diff_stat.js';
import gitDiffTargetCommand from './git/git_diff_target.js';
import gitDiffTargetStatCommand from './git/git_diff_target_stat.js';
import gitStatusCommand from './git/git_status.js';
import { makeHelpCommand } from './help.js';
import installWorkspaceCommand from './install_workspace.js';
import listTargetsCommand from './list_targets.js';
import fixFormattingCommand from './repair/fix_formatting.js';
import lintFixCommand from './repair/lint_fix.js';
import showTargetScriptsCommand from './show_target_scripts.js';
import snapshotUpdateCommand from './snapshot_update.js';
import testCommand from './test/test.js';
import testFileCommand from './test/test_file.js';
import testOneCommand from './test/test_one.js';
import type { CommandCategory, CommandDefinition } from './types.js';
import validateTargetsCommand from './validate_targets.js';
import checkFormattingCommand from './verify/check_formatting.js';
import lintCommand from './verify/lint.js';
import typeCheckCommand from './verify/type_check.js';

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
	testOneCommand,
	testFileCommand,
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
