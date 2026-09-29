import { existsSync, writeFileSync } from 'node:fs';

export function ensureHeader(path: string, header: string): void {
	if (!existsSync(path)) {
		writeFileSync(path, header);
	}
}
