export function eta(
	processedCount: number,
	totalCount: number,
	startedAt: Date,
): string {
	if (processedCount === 0) {
		return 'computing...';
	}
	const elapsedMs = Date.now() - startedAt.getTime();
	const remaining =
		(elapsedMs / processedCount) * (totalCount - processedCount);
	const minutes = Math.round(remaining / 60000);
	return `~${minutes}min`;
}
