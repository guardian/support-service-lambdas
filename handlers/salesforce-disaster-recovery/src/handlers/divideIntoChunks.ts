import { type UpdateZuoraAccountsLambdaInput } from './updateZuoraAccounts';

export const handler = async (event: {
	filePath: string;
	maxConcurrency: number;
	numberOfRecords: number;
}) => {
	// This is required since not making this handler async will cause the function to always return null
	await Promise.resolve();

	const { filePath, maxConcurrency, numberOfRecords } = event;
	const chunkSize = Math.ceil(numberOfRecords / maxConcurrency);

	const chunks: UpdateZuoraAccountsLambdaInput[] = [];

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
