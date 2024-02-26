import { type UpdateChunkZuoraAccountsLambdaInput } from './updateZuoraAccounts';

export const handler = async (event: {
	filePath: string;
	maxConcurrency: number;
	numberOfRecords: number;
}) => {
	await Promise.resolve();

	const { filePath, maxConcurrency, numberOfRecords } = event;
	const chunkSize = Math.ceil(numberOfRecords / maxConcurrency);

	const chunks: UpdateChunkZuoraAccountsLambdaInput[] = [];

	for (let i = 0; i < maxConcurrency; i++) {
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
