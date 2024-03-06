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

	// it('should handle special characters in data', () => {
	// 	const mockData = [
	// 		{ id: 1, name: 'John "Doe"', age: 30 },
	// 		{ id: 2, name: 'Alice, Bob', age: 25 },
	// 	];

	// 	const expectedResult = `id,name,age\n"1","John ""Doe""","30"\n"2","Alice, Bob","25"`;

	// 	const result = convertArrayToCsv({ arr: mockData });

	// 	expect(result).toEqual(expectedResult);
	// });

	// it('should handle empty values in data', () => {
	// 	const mockData = [
	// 		{ id: 1, name: '', age: null },
	// 		{ id: 2, name: 'Alice', age: undefined },
	// 	];

	// 	const expectedResult = `id,name,age\n1,"",\n2,"Alice",`;

	// 	const result = convertArrayToCsv({ arr: mockData });

	// 	expect(result).toEqual(expectedResult);
	// });
});
