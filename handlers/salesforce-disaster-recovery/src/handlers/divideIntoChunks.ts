export const handler = (event: {
	filePath: string;
	concurrency: number;
	numberOfRecords: number;
}) => {
	console.log('HERERE');
	console.log(event);
	const { filePath, concurrency, numberOfRecords } = event;
	console.log(filePath);
	const chunkSize = Math.ceil(numberOfRecords / concurrency);

	const chunks: Array<{
		filePath: string;
		startIndex: number;
		chunkSize: number;
	}> = [];

	console.log(chunks);

	for (let i = 0; i < concurrency; i++) {
		console.log(i);
		const startIndex = i * chunkSize;
		const endIndex = Math.min(startIndex + chunkSize - 1, numberOfRecords - 1);
		console.log(startIndex, endIndex);

		const chunk = {
			filePath,
			startIndex,
			chunkSize: endIndex - startIndex + 1,
		};
		console.log(chunk);

		chunks.push(chunk);
		console.log(chunk);
	}
	console.log('final');
	console.log(chunks);

	// return JSON.stringify([]);
	return {
		chunks: JSON.stringify([]),
	};
};
