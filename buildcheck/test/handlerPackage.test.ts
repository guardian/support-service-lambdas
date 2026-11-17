import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import handlerPackage from '../data/templates/handler/package.json';

test('packages root and nested bundles and source maps without unrelated files', () => {
	const directory = mkdtempSync(join(tmpdir(), 'handler-package-'));
	try {
		const target = join(directory, 'target');
		mkdirSync(join(target, 'refund', 'handlers'), { recursive: true });
		const bundles = [
			'index.js',
			'index.js.map',
			'refund/handlers/calculateRefund.js',
			'refund/handlers/calculateRefund.js.map',
		];
		for (const filename of [...bundles, 'unrelated.txt', 'previous.zip']) {
			writeFileSync(join(target, filename), 'test');
		}
		const scripts: Record<string, string> = handlerPackage({
			name: 'example',
			moduleDependencies: [],
		}).scripts;
		const packaging = scripts.packageQuick.split(' && ').slice(1).join(' && ');

		execFileSync('sh', ['-c', packaging], { cwd: directory });

		const entries = execFileSync(
			'unzip',
			['-Z1', join(target, 'example.zip')],
			{ encoding: 'utf8' },
		)
			.trim()
			.split('\n')
			.map((entry) => entry.replace(/^\.\//, ''));
		expect(entries.sort()).toEqual(bundles.sort());
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
