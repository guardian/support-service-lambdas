import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPnpmRunArgs } from './runScript.js';

void test('buildPnpmRunArgs forwards lint --fix without literal -- separator', () => {
	const args = buildPnpmRunArgs('modules/zuora', 'lint', ['--fix']);
	assert.deepEqual(args, [
		'--filter',
		'./modules/zuora',
		'run',
		'lint',
		'--fix',
	]);
});

void test('buildPnpmRunArgs preserves script arguments order for test_one patterns', () => {
	const args = buildPnpmRunArgs('modules/zuora', 'test', [
		'--testPathPattern',
		'foo.*bar',
	]);
	assert.deepEqual(args, [
		'--filter',
		'./modules/zuora',
		'run',
		'test',
		'--testPathPattern',
		'foo.*bar',
	]);
});
