import * as AWS from 'aws-sdk';
import { getSSMParam } from '../src/ssm';

jest.mock('aws-sdk');

const mockGetParameter = jest.fn();

AWS.SSM.prototype.getParameter = mockGetParameter;

describe('getSSMParam', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return the parameter value when found', async () => {
		const paramName = 'test-param';
		const paramValue = 'test-value';

		mockGetParameter.mockReturnValue({
			promise: jest.fn().mockResolvedValue({
				Parameter: { Value: paramValue },
			}),
		});

		const result = await getSSMParam(paramName);
		expect(result).toBe(paramValue);
		expect(mockGetParameter).toHaveBeenCalledWith({
			Name: paramName,
			WithDecryption: true,
		});
	});

	it('should throw an error when parameter is not found', async () => {
		const paramName = 'test-param';

		mockGetParameter.mockReturnValue({
			promise: jest.fn().mockResolvedValue({
				Parameter: null,
			}),
		});

		await expect(getSSMParam(paramName)).rejects.toThrow(
			`Failed to retrieve config from parameter store: ${paramName}`,
		);
	});

	it('should throw an error when AWS SDK fails', async () => {
		const paramName = 'test-param';

		mockGetParameter.mockReturnValue({
			promise: jest.fn().mockRejectedValue(new Error('AWS SDK error')),
		});

		await expect(getSSMParam(paramName)).rejects.toThrow('AWS SDK error');
	});
});
