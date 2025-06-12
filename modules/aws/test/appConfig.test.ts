import { SSMClient } from '@aws-sdk/client-ssm';
import { describe } from 'node:test';
import { z } from 'zod';
import {
	SSMKeyValuePairs,
	parseSSMConfigToObject,
	getTreeFromPaths,
	PathArrayWithValue,
	ConfigNestingError,
} from '../src/appConfig';

jest.mock('@aws-sdk/client-ssm');

const mockGetParameter = jest.fn();

SSMClient.prototype.send = mockGetParameter;

describe('parseSSMConfigToObject', () => {
	const dummyConfigRoot = '/CODE/stack/app';

	it('should handle a single string config value', () => {
		const key = '';
		const testValue = 'hi';
		const testData: Record<string, string>[] = [
			{ [dummyConfigRoot + key]: testValue },
		];
		const testSchema = z.string();

		type TestType = z.infer<typeof testSchema>;

		const expected: TestType = testValue;
		const actual: TestType = parseSSMConfigToObject(
			testData,
			dummyConfigRoot,
			testSchema,
		);
		expect(actual).toEqual(expected);
	});

	it('should handle a single nested config value', () => {
		const testValue = 'hi';
		const testData: SSMKeyValuePairs = [
			{ [dummyConfigRoot + '/myKey']: testValue },
		];
		const testSchema = z.object({ myKey: z.string() });

		type TestType = z.infer<typeof testSchema>;

		const expected: TestType = { myKey: testValue };
		const actual: TestType = parseSSMConfigToObject(
			testData,
			dummyConfigRoot,
			testSchema,
		);
		expect(actual).toEqual(expected);
	});

	it('should handle a single deeply config value', () => {
		const dummyConfigRoot = '/CODE/stack/app';
		const testValue = 'hi';
		const testData: SSMKeyValuePairs = [
			{ [dummyConfigRoot + '/myKey/nested']: testValue },
		];
		const testSchema = z.object({ myKey: z.object({ nested: z.string() }) });

		type TestType = z.infer<typeof testSchema>;

		const expected: TestType = { myKey: { nested: testValue } };
		const actual: TestType = parseSSMConfigToObject(
			testData,
			dummyConfigRoot,
			testSchema,
		);
		expect(actual).toEqual(expected);
	});

	it('should handle multiple different unnested config value', () => {
		const dummyConfigRoot = '/CODE/stack/app';
		const testValue1 = 'hi';
		const testValue2 = 'bye';
		const testData: SSMKeyValuePairs = [
			{ [dummyConfigRoot + '/myKey']: testValue1 },
			{ [dummyConfigRoot + '/myKey2']: testValue2 },
		];
		const testSchema = z.object({
			myKey: z.string(),
			myKey2: z.string(),
		});

		type TestType = z.infer<typeof testSchema>;

		const expected: TestType = {
			myKey: testValue1,
			myKey2: testValue2,
		};
		const actual: TestType = parseSSMConfigToObject(
			testData,
			dummyConfigRoot,
			testSchema,
		);
		expect(actual).toEqual(expected);
	});

	it('should handle multiple different nested config value in the same key', () => {
		const dummyConfigRoot = '/CODE/stack/app';
		const testValue1 = 'hi';
		const testValue2 = 'bye';
		const testData: SSMKeyValuePairs = [
			{ [dummyConfigRoot + '/myKey/nested']: testValue1 },
			{ [dummyConfigRoot + '/myKey/nested2']: testValue2 },
		];
		const testSchema = z.object({
			myKey: z.object({ nested: z.string(), nested2: z.string() }),
		});

		type TestType = z.infer<typeof testSchema>;

		const expected: TestType = {
			myKey: { nested: testValue1, nested2: testValue2 },
		};
		const actual: TestType = parseSSMConfigToObject(
			testData,
			dummyConfigRoot,
			testSchema,
		);
		expect(actual).toEqual(expected);
	});

	it('should handle multiple different nested config value in the different keys', () => {
		const dummyConfigRoot = '/CODE/stack/app';
		const testValue1 = 'hi';
		const testValue2 = 'bye';
		const testData: SSMKeyValuePairs = [
			{ [dummyConfigRoot + '/myKey/nested']: testValue1 },
			{ [dummyConfigRoot + '/myKey2/nested']: testValue2 },
		];
		const testSchema = z.object({
			myKey: z.object({ nested: z.string() }),
			myKey2: z.object({ nested: z.string() }),
		});

		type TestType = z.infer<typeof testSchema>;

		const expected: TestType = {
			myKey: { nested: testValue1 },
			myKey2: { nested: testValue2 },
		};
		const actual: TestType = parseSSMConfigToObject(
			testData,
			dummyConfigRoot,
			testSchema,
		);
		expect(actual).toEqual(expected);
	});
});

describe('getTreeFromPaths', () => {
	it('should throw if a value clashes with a tree', () => {
		const testData: PathArrayWithValue[] = [
			{ path: ['myKey'], value: 'v1' },
			{ path: ['myKey', 'nested'], value: 'v2' },
		];

		// const expected = configNestingError;
		const actual = () => getTreeFromPaths(testData);
		expect(actual).toThrow(ConfigNestingError);
	});
});
