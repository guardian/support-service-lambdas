import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildPnpmChangedArgs,
	buildPnpmExplicitArgs,
	filterLinesByPattern,
} from './run.js';

void test('buildPnpmExplicitArgs generates --filter ./pkg with --if-present', () => {
	assert.deepEqual(buildPnpmExplicitArgs(['modules/zuora'], 'lint'), [
		'--filter',
		'./modules/zuora',
		'run',
		'--if-present',
		'lint',
	]);
});

void test('buildPnpmExplicitArgs supports multiple packages and extra args', () => {
	assert.deepEqual(
		buildPnpmExplicitArgs(['modules/zuora', 'cdk'], 'lint', ['--fix']),
		[
			'--filter',
			'./modules/zuora',
			'--filter',
			'./cdk',
			'run',
			'--if-present',
			'lint',
			'--fix',
		],
	);
});

void test('filterLinesByPattern keeps only matching lines', () => {
	const output = ['alpha', 'beta', 'gamma', 'beta-two'].join('\n');
	const filtered = filterLinesByPattern(output, /beta/);
	assert.equal(filtered, ['beta', 'beta-two'].join('\n'));
});

void test('filterLinesByPattern returns original output when grep is disabled', () => {
	const output = ['one', 'two'].join('\n');
	const filtered = filterLinesByPattern(output, null);
	assert.equal(filtered, output);
});

void test('buildPnpmChangedArgs generates ...{./pkg} filters with --if-present', () => {
	assert.deepEqual(
		buildPnpmChangedArgs(
			['modules/zuora', 'handlers/discount-api'],
			'type-check',
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

void test('buildPnpmChangedArgs forwards extra args after the script', () => {
	assert.deepEqual(
		buildPnpmChangedArgs(['modules/zuora'], 'test', ['myPattern']),
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
