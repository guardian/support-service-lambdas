import assert from 'node:assert/strict';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { COMMANDS } from './commands.js';
import { getLastLogPath } from './run.js';

// A distinct fake root (not tmpdir() itself) so the hashed log path used by
// these tests never collides with the one run.test.ts exercises concurrently.
const TEST_ROOT = `${tmpdir()}/agent-tools-commands-test`;

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

void test('last: fails clearly when no log has been recorded for this repository', async () => {
	cleanupLastLog(TEST_ROOT);
	const result = await COMMANDS['last']!.handler([], baseExecOptions);
	assert.equal(result.exitCode, 1);
	assert.match(result.output, /no previous command output recorded/);
});

void test('last: returns the full recorded output re-filtered by the default cap', async () => {
	cleanupLastLog(TEST_ROOT);
	try {
		const lines = Array.from({ length: 5 }, (_, i) => `line${i + 1}`).join(
			'\n',
		);
		writeFileSync(getLastLogPath(TEST_ROOT), lines);
		const result = await COMMANDS['last']!.handler([], baseExecOptions);
		assert.equal(result.exitCode, 0);
		assert.equal(result.output, lines);
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
});

void test('last: honors --grep to filter the recorded output', async () => {
	cleanupLastLog(TEST_ROOT);
	try {
		writeFileSync(
			getLastLogPath(TEST_ROOT),
			['keep-me', 'skip-me', 'keep-me-too'].join('\n'),
		);
		const result = await COMMANDS['last']!.handler([], {
			...baseExecOptions,
			grepPattern: 'keep',
			grepRegex: /keep/,
		});
		assert.equal(result.output, ['keep-me', 'keep-me-too'].join('\n'));
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
});

void test('last: reports empty output distinctly when the recorded log is blank', async () => {
	cleanupLastLog(TEST_ROOT);
	try {
		writeFileSync(getLastLogPath(TEST_ROOT), '');
		const result = await COMMANDS['last']!.handler([], baseExecOptions);
		assert.equal(result.exitCode, 0);
		assert.equal(result.output, '(no output)');
	} finally {
		cleanupLastLog(TEST_ROOT);
	}
});
