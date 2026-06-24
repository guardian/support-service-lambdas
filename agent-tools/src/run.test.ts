import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPnpmArgs, filterLinesByPattern } from './run.js';

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
