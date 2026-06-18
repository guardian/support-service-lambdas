import { resolve } from 'path';
import { fail, requireSingleTarget } from '../../cli/commandArgs.js';
import { ROOT } from '../../tools/runScript.js';
import type { CommandDefinition } from '../types.js';
import { runTestWithArgs } from './testStep.js';

const safetyNote =
	'test executes repository code, forces CI=true, and uses fixed timeouts';

function safeRelativePath(filePath: string): string | null {
	const normalized = filePath.replace(/^\/+/, '');
	if (normalized.includes('..')) {
		return null;
	}
	const abs = resolve(ROOT, normalized);
	if (abs !== ROOT && !abs.startsWith(`${ROOT}/`)) {
		return null;
	}
	return normalized;
}

export default {
	name: 'test-file',
	usage: '<target> <filePath>',
	description: 'run tests in one target for a specific file path',
	category: 'Test',
	safetyNote,
	handler: async (args, context) => {
		if (args.length !== 2) {
			return fail('test-file requires exactly one target and one filePath');
		}
		const target = requireSingleTarget([args[0]!], 'test-file');
		if ('exitCode' in target) {
			return target;
		}
		const filePath = args[1]!;
		const safePath = safeRelativePath(filePath);
		if (!safePath) {
			return fail(`invalid filePath: ${filePath}`);
		}
		if (!safePath.startsWith(`${target.target}/`)) {
			return fail(
				`filePath must be inside target ${target.target}: ${filePath}`,
			);
		}
		return await runTestWithArgs(
			[target.target],
			[safePath],
			context.execOptions,
		);
	},
} satisfies CommandDefinition;
