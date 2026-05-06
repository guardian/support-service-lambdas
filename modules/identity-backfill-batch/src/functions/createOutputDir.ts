import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Stage } from '../types';

export function createOutputDir(stage: Stage): string {
	const home = process.env.HOME ?? '.';
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const dir = join(
		home,
		'Downloads',
		'identity-backfill-batch-results',
		`${stage}-${timestamp}`,
	);
	mkdirSync(dir, { recursive: true });
	return dir;
}
