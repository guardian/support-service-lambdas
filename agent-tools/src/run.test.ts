import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildPnpmArgs,
	filterLinesByPattern,
	filterLinesByPatternWithContext,
	getLastLogPath,
	postProcessOutput,
	resolveRepoPath,
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
