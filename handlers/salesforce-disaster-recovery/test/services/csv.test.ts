import { convertArrayToCsv } from '../../src/services';

describe('convertArrayToCsv', () => {
	it('should return empty string if array is empty', () => {
		const result = convertArrayToCsv({ arr: [] });
		expect(result).toEqual('');
	});

	it('should convert array to CSV string', () => {
		const mockData = [
			{ id: 1, name: 'John', age: 30 },
			{ id: 2, name: 'Alice', age: 25 },
		];

		const expectedResult = `id,name,age\n"1","John","30"\n"2","Alice","25"`;

		const result = convertArrayToCsv({ arr: mockData });

		expect(result).toEqual(expectedResult);
	});
});
