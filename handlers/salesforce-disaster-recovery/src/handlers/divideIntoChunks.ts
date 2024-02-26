export const handler = async (event: {
	filePath: string;
	concurrency: number;
	numberOfRecords: number;
}) => {
	await Promise.resolve();

	const { filePath, concurrency, numberOfRecords } = event;
	const chunkSize = Math.ceil(numberOfRecords / concurrency);

	const chunks: Array<{
		filePath: string;
		startIndex: number;
		chunkSize: number;
	}> = [];

	for (let i = 0; i < concurrency; i++) {
		const startIndex = i * chunkSize;
		const endIndex = Math.min(startIndex + chunkSize - 1, numberOfRecords - 1);

		const chunk = {
			filePath,
			startIndex,
			chunkSize: endIndex - startIndex + 1,
		};

		chunks.push(chunk);
	}

	return {
		chunks,
	};
};
