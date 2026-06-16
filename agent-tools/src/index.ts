import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runGit, runGitForTarget } from './tools/git.js';
import { runRepair, runRepairChanged } from './tools/repair.js';
import {
	listTargets,
	showTargetScripts,
	validateTargetsTool,
} from './tools/targets.js';
import {
	runTest,
	runTestChanged,
	runTestFile,
	runTestOne,
} from './tools/test.js';
import { runVerify, runVerifyChanged } from './tools/verify.js';

const server = new McpServer({ name: 'agent-tools', version: '1.0.0' });

const targetsParam = {
	targets: z
		.array(z.string().regex(/^(handlers|modules)\/[a-zA-Z0-9._-]+$/))
		.min(1)
		.describe(
			"One or more workspace targets, e.g. ['handlers/new-subscription-api']",
		),
};

const targetParam = {
	target: z
		.string()
		.regex(/^(handlers|modules)\/[a-zA-Z0-9._-]+$/)
		.describe("Workspace target, e.g. 'handlers/new-subscription-api'"),
};

server.registerTool(
	'verify',
	{
		description:
			'Run check-formatting, lint, and type-check for handlers/* or modules/* targets.',
		inputSchema: targetsParam,
	},
	({ targets }) => runVerify(targets),
);

server.registerTool(
	'verify_changed',
	{
		description:
			'Run verify for changed handlers/* and modules/* targets only (staged + unstaged).',
	},
	() => runVerifyChanged(),
);

server.registerTool(
	'repair',
	{
		description:
			'Run fix-formatting and lint --fix for handlers/* or modules/* targets.',
		inputSchema: targetsParam,
	},
	({ targets }) => runRepair(targets),
);

server.registerTool(
	'repair_changed',
	{
		description:
			'Run repair for changed handlers/* and modules/* targets only (staged + unstaged).',
	},
	() => runRepairChanged(),
);

// Note: tests execute arbitrary repository code and are less safe than verify/repair.
server.registerTool(
	'test',
	{
		description:
			'Run safe unit tests for handlers/* or modules/* targets (CI mode + timeout). Integration-like test scripts are blocked.',
		inputSchema: targetsParam,
	},
	({ targets }) => runTest(targets),
);

server.registerTool(
	'test_changed',
	{
		description:
			'Run safe unit tests for changed handlers/* and modules/* targets only.',
	},
	() => runTestChanged(),
);

server.registerTool(
	'test_one',
	{
		description:
			'Run safe unit tests for one target filtered by test path pattern.',
		inputSchema: {
			...targetParam,
			pattern: z.string().min(1).describe('Jest --testPathPattern value'),
		},
	},
	({ target, pattern }) => runTestOne(target, pattern),
);

server.registerTool(
	'test_file',
	{
		description:
			'Run safe unit tests for one target and one test file path inside that target.',
		inputSchema: {
			...targetParam,
			filePath: z.string().min(1).describe('Workspace-relative test file path'),
		},
	},
	({ target, filePath }) => runTestFile(target, filePath),
);

server.registerTool(
	'list_targets',
	{
		description:
			'List valid handlers/* and modules/* targets for verify, repair, and test.',
	},
	() => listTargets(),
);

server.registerTool(
	'validate_targets',
	{
		description:
			'Validate target names and report invalid format or missing directories.',
		inputSchema: targetsParam,
	},
	({ targets }) => validateTargetsTool(targets),
);

server.registerTool(
	'show_target_scripts',
	{
		description: 'Show available npm scripts for a target package.',
		inputSchema: targetParam,
	},
	({ target }) => showTargetScripts(target),
);

server.registerTool(
	'git_status',
	{ description: 'Show short git status.' },
	() => runGit('status'),
);

server.registerTool(
	'git_diff',
	{
		description:
			'Show full unstaged diff (use git_diff_stat first for large changesets).',
	},
	() => runGit('diff'),
);

server.registerTool(
	'git_diff_target',
	{
		description: 'Show unstaged diff limited to one target directory.',
		inputSchema: targetParam,
	},
	({ target }) => runGitForTarget('diff-target', target),
);

server.registerTool(
	'git_diff_staged',
	{ description: 'Show full staged diff.' },
	() => runGit('diff-staged'),
);

server.registerTool(
	'git_diff_stat',
	{ description: 'Show file-level summary of unstaged changes.' },
	() => runGit('diff-stat'),
);

server.registerTool(
	'git_diff_target_stat',
	{
		description: 'Show file-level summary of unstaged changes for one target.',
		inputSchema: targetParam,
	},
	({ target }) => runGitForTarget('diff-target-stat', target),
);

server.registerTool(
	'git_diff_staged_stat',
	{ description: 'Show file-level summary of staged changes.' },
	() => runGit('diff-staged-stat'),
);

server.registerTool(
	'git_changed_files',
	{ description: 'List unstaged changed file names.' },
	() => runGit('name-only'),
);

server.registerTool(
	'git_changed_files_staged',
	{ description: 'List staged changed file names.' },
	() => runGit('name-only-staged'),
);

const transport = new StdioServerTransport();
await server.connect(transport);
