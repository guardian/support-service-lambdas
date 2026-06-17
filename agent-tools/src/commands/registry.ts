import { checkFormattingCommand } from './check_formatting.js';
import { fixFormattingCommand } from './fix_formatting.js';
import { gitChangedFilesCommand } from './git_changed_files.js';
import { gitChangedFilesStagedCommand } from './git_changed_files_staged.js';
import { gitDiffCommand } from './git_diff.js';
import { gitDiffStagedCommand } from './git_diff_staged.js';
import { gitDiffStagedStatCommand } from './git_diff_staged_stat.js';
import { gitDiffStatCommand } from './git_diff_stat.js';
import { gitDiffTargetCommand } from './git_diff_target.js';
import { gitDiffTargetStatCommand } from './git_diff_target_stat.js';
import { gitStatusCommand } from './git_status.js';
import { installWorkspaceCommand } from './install_workspace.js';
import { lintCommand } from './lint.js';
import { lintFixCommand } from './lint_fix.js';
import { listTargetsCommand } from './list_targets.js';
import { showTargetScriptsCommand } from './show_target_scripts.js';
import { snapshotUpdateCommand } from './snapshot_update.js';
import { testCommand } from './test.js';
import { testFileCommand } from './test_file.js';
import { testOneCommand } from './test_one.js';
import { typeCheckCommand } from './type_check.js';
import type { CommandCategory, CommandDefinition } from './types.js';
import { validateTargetsCommand } from './validate_targets.js';
import { verifyCommand } from './verify.js';

const rawCommandDefinitions = [
	listTargetsCommand,
	validateTargetsCommand,
	showTargetScriptsCommand,
	verifyCommand,
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
] satisfies readonly CommandDefinition[];

const seenNames = new Set<string>();
for (const definition of rawCommandDefinitions) {
	if (seenNames.has(definition.name)) {
		throw new Error(`Duplicate command name in registry: ${definition.name}`);
	}
	seenNames.add(definition.name);
}

export const commandDefinitions = rawCommandDefinitions;

export const categoryOrder: CommandCategory[] = [
	'Utility',
	'Verification',
	'Fix',
	'Test',
	'Workspace',
	'Git',
];
