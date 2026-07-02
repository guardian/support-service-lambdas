import assert from 'node:assert/strict';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test from 'node:test';
import {
	buildPnpmArgs,
	filterLinesByPattern,
	filterLinesByPatternWithContext,
	formatTruncationNotice,
	getLastLogPath,
	parseGlobalOptions,
	postProcessOutput,
	resolveRepoPath,
	run,
	shouldStreamIncrementally,
} from './run.js';

void test('buildPnpmArgs explicit: generates --filter ./pkg with --if-present', () => {
	assert.deepEqual(buildPnpmArgs(['modules/zuora'], 'lint'), [
		'--filter',
		'./modules/zuora',
		'run',
		'--if-present',
		'lint',
	]);
});

void test('buildPnpmArgs explicit: supports multiple packages and extra args', () => {
	assert.deepEqual(buildPnpmArgs(['modules/zuora', 'cdk'], 'lint', ['--fix']), [
		'--filter',
		'./modules/zuora',
		'--filter',
		'./cdk',
		'run',
		'--if-present',
		'lint',
		'--fix',
	]);
});

void test('buildPnpmArgs changed: generates ...{./pkg} filters', () => {
	assert.deepEqual(
		buildPnpmArgs(
			['modules/zuora', 'handlers/discount-api'],
			'type-check',
			[],
			true,
		),
		[
			'--filter',
			'...{./modules/zuora}',
			'--filter',
			'...{./handlers/discount-api}',
			'run',
			'--if-present',
			'type-check',
		],
	);
});

void test('buildPnpmArgs changed: forwards extra args after the script', () => {
	assert.deepEqual(
		buildPnpmArgs(['modules/zuora'], 'test', ['myPattern'], true),
		[
			'--filter',
			'...{./modules/zuora}',
			'run',
			'--if-present',
			'test',
			'myPattern',
		],
	);
});

void test('filterLinesByPattern keeps only matching lines', () => {
	const output = ['alpha', 'beta', 'gamma', 'beta-two'].join('\n');
	assert.equal(
		filterLinesByPattern(output, /beta/),
		['beta', 'beta-two'].join('\n'),
	);
});

void test('filterLinesByPattern returns original output when grep is disabled', () => {
	const output = ['one', 'two'].join('\n');
	assert.equal(filterLinesByPattern(output, null), output);
});

void test('filterLinesByPatternWithContext returns original output when grep is disabled', () => {
	const output = ['one', 'two'].join('\n');
	assert.equal(filterLinesByPatternWithContext(output, null, 2), output);
});

void test('filterLinesByPatternWithContext: context 0 behaves like a plain filter (no separators)', () => {
	const output = ['MATCH1', 'l1', 'MATCH2'].join('\n');
	assert.equal(
		filterLinesByPatternWithContext(output, /MATCH/, 0),
		['MATCH1', 'MATCH2'].join('\n'),
	);
});

void test('filterLinesByPatternWithContext: context 1 includes one line before and after', () => {
	const output = ['a', 'MATCH', 'c'].join('\n');
	assert.equal(
		filterLinesByPatternWithContext(output, /MATCH/, 1),
		['a', 'MATCH', 'c'].join('\n'),
	);
});

void test('filterLinesByPatternWithContext: overlapping windows merge without duplication or separators', () => {
	const output = ['l0', 'MATCH1', 'l2', 'MATCH2', 'l4'].join('\n');
	assert.equal(
		filterLinesByPatternWithContext(output, /MATCH/, 1),
		['l0', 'MATCH1', 'l2', 'MATCH2', 'l4'].join('\n'),
	);
});

void test('filterLinesByPatternWithContext: disjoint groups get a -- separator', () => {
	const output = ['l0', 'MATCH1', 'l2', 'l3', 'l4', 'l5', 'MATCH2', 'l7'].join(
		'\n',
	);
	assert.equal(
		filterLinesByPatternWithContext(output, /MATCH/, 1),
		['l0', 'MATCH1', 'l2', '--', 'l5', 'MATCH2', 'l7'].join('\n'),
	);
});

void test('filterLinesByPatternWithContext: window is clipped at output boundaries', () => {
	const output = ['MATCH', 'l1', 'l2'].join('\n');
	assert.equal(
		filterLinesByPatternWithContext(output, /MATCH/, 2),
		['MATCH', 'l1', 'l2'].join('\n'),
	);
});

const ROOT = '/repo/root';

void test('resolveRepoPath: relative path inside repo returns repo-relative path', () => {
	assert.equal(
		resolveRepoPath(ROOT, 'handlers/product-switch-api/src/foo.ts'),
		'handlers/product-switch-api/src/foo.ts',
	);
});

void test('resolveRepoPath: absolute path inside repo returns repo-relative path', () => {
	assert.equal(
		resolveRepoPath(ROOT, `${ROOT}/handlers/foo.ts`),
		'handlers/foo.ts',
	);
});

void test('resolveRepoPath: path traversal escaping repo returns null', () => {
	assert.equal(resolveRepoPath(ROOT, '../../etc/passwd'), null);
});

void test('resolveRepoPath: absolute path outside repo returns null', () => {
	assert.equal(resolveRepoPath(ROOT, '/etc/passwd'), null);
});

void test('resolveRepoPath: repo root itself returns null', () => {
	assert.equal(resolveRepoPath(ROOT, ROOT), null);
});

void test('resolveRepoPath: path that shares root prefix but escapes returns null', () => {
	// /repo/rootevil must not be accepted when root is /repo/root
	assert.equal(resolveRepoPath(ROOT, '/repo/rootevil/file.ts'), null);
});

const manyLines = Array.from({ length: 50 }, (_, i) => `line${i + 1}`).join(
	'\n',
);

void test('postProcessOutput: empty output returns empty, untruncated result', () => {
	assert.deepEqual(
		postProcessOutput('   \n  ', {
			tailLines: null,
			grepRegex: null,
			contextLines: null,
			all: false,
			defaultCap: 40,
		}),
		{ excerpt: '', truncated: false, totalLines: 0, keptLines: 0 },
	);
});

void test('postProcessOutput: grep matching nothing returns empty, untruncated result', () => {
	assert.deepEqual(
		postProcessOutput(manyLines, {
			tailLines: null,
			grepRegex: /NOPE/,
			contextLines: null,
			all: false,
			defaultCap: 40,
		}),
		{ excerpt: '', truncated: false, totalLines: 0, keptLines: 0 },
	);
});

void test('postProcessOutput: defaultCap applies and reports truncated when tailLines is absent', () => {
	const result = postProcessOutput(manyLines, {
		tailLines: null,
		grepRegex: null,
		contextLines: null,
		all: false,
		defaultCap: 10,
	});
	assert.equal(result.truncated, true);
	assert.equal(result.totalLines, 50);
	assert.equal(result.keptLines, 10);
	assert.equal(
		result.excerpt,
		Array.from({ length: 10 }, (_, i) => `line${41 + i}`).join('\n'),
	);
});

void test('postProcessOutput: explicit tailLines is honored and never reported as truncated', () => {
	const result = postProcessOutput(manyLines, {
		tailLines: 5,
		grepRegex: null,
		contextLines: null,
		all: false,
		defaultCap: 10,
	});
	assert.equal(result.truncated, false);
	assert.equal(result.keptLines, 5);
	assert.equal(
		result.excerpt,
		Array.from({ length: 5 }, (_, i) => `line${46 + i}`).join('\n'),
	);
});

void test('postProcessOutput: all bypasses defaultCap entirely', () => {
	const result = postProcessOutput(manyLines, {
		tailLines: null,
		grepRegex: null,
		contextLines: null,
		all: true,
		defaultCap: 10,
	});
	assert.equal(result.truncated, false);
	assert.equal(result.keptLines, 50);
	assert.equal(result.excerpt, manyLines);
});

void test('postProcessOutput: all bypasses even an explicit tailLines', () => {
	const result = postProcessOutput(manyLines, {
		tailLines: 5,
		grepRegex: null,
		contextLines: null,
		all: true,
		defaultCap: 10,
	});
	assert.equal(result.truncated, false);
	assert.equal(result.keptLines, 50);
	assert.equal(result.excerpt, manyLines);
});

void test('postProcessOutput: contextLines set uses context-aware filtering (separators included)', () => {
	const output = ['l0', 'MATCH1', 'l2', 'l3', 'l4', 'l5', 'MATCH2', 'l7'].join(
		'\n',
	);
	const result = postProcessOutput(output, {
		tailLines: null,
		grepRegex: /MATCH/,
		contextLines: 1,
		all: false,
		defaultCap: 40,
	});
	assert.equal(
		result.excerpt,
		['l0', 'MATCH1', 'l2', '--', 'l5', 'MATCH2', 'l7'].join('\n'),
	);
});

void test('postProcessOutput: contextLines null uses plain pattern filtering (no separators)', () => {
	const output = ['l0', 'MATCH1', 'l2', 'l3', 'l4', 'l5', 'MATCH2', 'l7'].join(
		'\n',
	);
	const result = postProcessOutput(output, {
		tailLines: null,
		grepRegex: /MATCH/,
		contextLines: null,
		all: false,
		defaultCap: 40,
	});
	assert.equal(result.excerpt, ['MATCH1', 'MATCH2'].join('\n'));
});

void test('getLastLogPath: deterministic for the same root', () => {
	assert.equal(getLastLogPath('/repo/root'), getLastLogPath('/repo/root'));
});

void test('getLastLogPath: different for different roots', () => {
	assert.notEqual(
		getLastLogPath('/repo/root-a'),
		getLastLogPath('/repo/root-b'),
	);
});

void test('getLastLogPath: lives in the OS temp dir and is repo-specific', () => {
	const path = getLastLogPath('/repo/root');
	assert.match(path, /agent-tool-last-[0-9a-f]{12}\.log$/);
});

void test('formatTruncationNotice: returns null when not truncated', () => {
	assert.equal(
		formatTruncationNotice({ truncated: false, totalLines: 5, keptLines: 5 }),
		null,
	);
});

void test('formatTruncationNotice: default context mentions ./agent-tool last', () => {
	assert.equal(
		formatTruncationNotice({
			truncated: true,
			totalLines: 312,
			keptLines: 40,
		}),
		'— showing last 40 of 312 lines — run ./agent-tool last for more, or pass --all/--tail/--grep/--context',
	);
});

void test('formatTruncationNotice: "last" context omits the self-referential "run last" hint', () => {
	assert.equal(
		formatTruncationNotice(
			{ truncated: true, totalLines: 312, keptLines: 200 },
			'last',
		),
		'— showing last 200 of 312 lines — pass --all/--tail/--grep/--context',
	);
});

// tmpdir() is a real, existing directory distinct from any actual repo root,
// so it's a safe stand-in for `root` (used as both cwd and the log-path key)
// in these integration-style tests that spawn a real child process.
const TEST_ROOT = tmpdir();

function cleanupLastLog(root: string): void {
	const path = getLastLogPath(root);
	if (existsSync(path)) {
		unlinkSync(path);
	}
}

const baseExecOptions = {
	root: TEST_ROOT,
	verbose: false,
	tailLines: null,
	grepPattern: null,
	grepRegex: null,
	contextLines: null,
	all: false,
};

void test('run: captures full combined stdout/stderr to the per-root log file', async () => {
	cleanupLastLog(TEST_ROOT);
	try {
		await run(
			'node',
			['-e', 'console.log("out-marker"); console.error("err-marker")'],
			baseExecOptions,
		);
		const logged = readFileSync(getLastLogPath(TEST_ROOT), 'utf-8');
		assert.match(logged, /out-marker/);
		assert.match(logged, /err-marker/);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
});

void test('run: overwrites rather than appends to the previous log for the same root', async () => {
	cleanupLastLog(TEST_ROOT);
	try {
		await run('node', ['-e', 'console.log("first-run")'], baseExecOptions);
		await run('node', ['-e', 'console.log("second-run")'], baseExecOptions);
		const logged = readFileSync(getLastLogPath(TEST_ROOT), 'utf-8');
		assert.equal(logged.includes('first-run'), false);
		assert.match(logged, /second-run/);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
});

void test('parseGlobalOptions: parses all flags and leaves other args as positionals', () => {
	assert.deepEqual(
		parseGlobalOptions([
			'test',
			'handlers/foo',
			'--tail',
			'50',
			'--grep',
			'ERROR',
			'--context',
			'3',
			'--all',
		]),
		{
			positionals: ['test', 'handlers/foo'],
			tailLines: 50,
			grepPattern: 'ERROR',
			contextLines: 3,
			all: true,
		},
	);
});

void test('parseGlobalOptions: defaults when no flags are given', () => {
	assert.deepEqual(parseGlobalOptions(['test', 'handlers/foo']), {
		positionals: ['test', 'handlers/foo'],
		tailLines: null,
		grepPattern: null,
		contextLines: null,
		all: false,
	});
});

void test('parseGlobalOptions: --tail requires a numeric value', () => {
	const result = parseGlobalOptions(['--tail']);
	assert.ok('exitCode' in result);
	assert.equal(result.exitCode, 1);
	assert.match(result.output, /--tail requires a numeric value/);
});

void test('parseGlobalOptions: rejects invalid --tail value', () => {
	const result = parseGlobalOptions(['--tail', 'abc']);
	assert.ok('exitCode' in result);
	assert.match(result.output, /invalid --tail value: abc/);
});

void test('parseGlobalOptions: rejects invalid --grep regex', () => {
	const result = parseGlobalOptions(['--grep', '(']);
	assert.ok('exitCode' in result);
	assert.match(result.output, /invalid --grep pattern/);
});

void test('parseGlobalOptions: rejects --context without --grep', () => {
	const result = parseGlobalOptions(['--context', '3']);
	assert.ok('exitCode' in result);
	assert.match(result.output, /--context requires --grep/);
});

void test('parseGlobalOptions: accepts --context 0 when --grep is present', () => {
	const result = parseGlobalOptions(['--grep', 'ERROR', '--context', '0']);
	assert.deepEqual(result, {
		positionals: [],
		tailLines: null,
		grepPattern: 'ERROR',
		contextLines: 0,
		all: false,
	});
});

void test('parseGlobalOptions: rejects negative --context value', () => {
	const result = parseGlobalOptions(['--grep', 'ERROR', '--context', '-1']);
	assert.ok('exitCode' in result);
	assert.match(result.output, /invalid --context value: -1/);
});

void test('parseGlobalOptions: --all is a plain boolean flag', () => {
	const result = parseGlobalOptions(['--all']);
	assert.deepEqual(result, {
		positionals: [],
		tailLines: null,
		grepPattern: null,
		contextLines: null,
		all: true,
	});
});

void test('shouldStreamIncrementally: true when contextLines is null', () => {
	assert.equal(shouldStreamIncrementally({ contextLines: null }), true);
});

void test('shouldStreamIncrementally: false whenever contextLines is set, including 0', () => {
	assert.equal(shouldStreamIncrementally({ contextLines: 0 }), false);
	assert.equal(shouldStreamIncrementally({ contextLines: 3 }), false);
});

void test('run: --context buffers output and prints the filtered block once instead of streaming incrementally', async () => {
	cleanupLastLog(TEST_ROOT);
	const calls: string[] = [];
	try {
		await run(
			'node',
			[
				'-e',
				'console.log("l0"); console.log("MATCH"); console.log("l2"); console.log("l3")',
			],
			{
				...baseExecOptions,
				verbose: true,
				grepPattern: 'MATCH',
				grepRegex: /MATCH/,
				contextLines: 1,
			},
			(text) => calls.push(text),
		);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
	// Exactly one write for the whole context-filtered block; l3 excluded since
	// it falls outside the +-1 line window around the match.
	assert.deepEqual(calls, ['l0\nMATCH\nl2\n']);
});

void test('run: without --context, matching lines still stream incrementally as they arrive', async () => {
	cleanupLastLog(TEST_ROOT);
	const calls: string[] = [];
	try {
		await run(
			'node',
			[
				'-e',
				'console.log("l0"); console.log("MATCH1"); console.log("l2"); console.log("MATCH2")',
			],
			{
				...baseExecOptions,
				verbose: true,
				grepPattern: 'MATCH',
				grepRegex: /MATCH/,
				contextLines: null,
			},
			(text) => calls.push(text),
		);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
	// One write per matching line as it streams, not a single buffered block.
	assert.deepEqual(calls, ['MATCH1\n', 'MATCH2\n']);
});

void test('run: --context still prints the buffered block on success (which shows no other output)', async () => {
	cleanupLastLog(TEST_ROOT);
	const calls: string[] = [];
	try {
		const result = await run(
			'node',
			['-e', 'console.log("MATCH")'],
			{
				...baseExecOptions,
				verbose: true,
				grepPattern: 'MATCH',
				grepRegex: /MATCH/,
				contextLines: 0,
			},
			(text) => calls.push(text),
		);
		assert.equal(result.passed, true);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
	assert.deepEqual(calls, ['MATCH\n']);
});

void test('run: failure ScriptResult reports truncation metadata for the excerpt', async () => {
	cleanupLastLog(TEST_ROOT);
	try {
		const result = await run(
			'node',
			[
				'-e',
				'for (let i = 1; i <= 50; i++) { console.log(`line${i}`); } process.exit(1);',
			],
			baseExecOptions,
		);
		assert.equal(result.passed, false);
		assert.equal(result.truncated, true);
		assert.equal(result.totalLines, 50);
		assert.equal(result.keptLines, 40);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
});
