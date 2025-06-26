import { SSMClient } from '@aws-sdk/client-ssm';
import { getSSMParam } from '../src/ssm';

jest.mock('@aws-sdk/client-ssm');

const mockGetParameter = jest.fn();

SSMClient.prototype.send = mockGetParameter;

describe('getSSMParam', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return the parameter value when found', async () => {
		const paramName = 'test-param';
		const paramValue = 'test-value';

		mockGetParameter.mockReturnValue(
			Promise.resolve({
				Parameter: { Value: paramValue },
			}),
		);

		const result = await getSSMParam(paramName);
		expect(result).toBe(paramValue);
		expect(mockGetParameter).toHaveBeenCalledTimes(1);
	});

	it('should throw an error when parameter is not found', async () => {
		const paramName = 'test-param';

		mockGetParameter.mockReturnValue(
			Promise.resolve({
				Parameter: null,
			}),
		);

		await expect(getSSMParam(paramName)).rejects.toThrow(
			`Failed to retrieve config from parameter store: ${paramName}`,
		);
	});

	it('should throw an error when AWS SDK fails', async () => {
		const paramName = 'test-param';

		mockGetParameter.mockRejectedValue(new Error('AWS SDK error'));

		await expect(getSSMParam(paramName)).rejects.toThrow('AWS SDK error');
	});
});
