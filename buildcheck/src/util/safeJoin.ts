import path from 'path';

export function safeJoin(basePath: string, relativePath: string): string {
	const fullPath = path.join(basePath, relativePath);
	const resolvedBase = path.resolve(basePath);
	const resolvedTarget = path.resolve(fullPath);

	if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
		throw new Error(
			`Path traversal detected: ${relativePath} escapes base directory ${basePath}`,
		);
	}

	return fullPath;
}
