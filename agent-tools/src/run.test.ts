import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPnpmArgs, filterLinesByPattern, resolveRepoPath } from './run.js';

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
