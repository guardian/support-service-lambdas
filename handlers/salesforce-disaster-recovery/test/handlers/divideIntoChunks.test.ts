import { handler } from '../../src/handlers/divideIntoChunks';

jest.mock('../../src/services');

describe('Handler', () => {
	const mockEvent = {
		filePath: 'filePath',
		concurrency: 3,
		numberOfRecords: 10,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		console.error = jest.fn();
	});

	it('should handle successfully', () => {
		const result = handler(mockEvent);

		expect(result).toEqual([
			{ filePath: 'filePath', startIndex: 0, chunkSize: 4 },
			{ filePath: 'filePath', startIndex: 4, chunkSize: 4 },
			{ filePath: 'filePath', startIndex: 8, chunkSize: 2 },
		]);
	});
});
