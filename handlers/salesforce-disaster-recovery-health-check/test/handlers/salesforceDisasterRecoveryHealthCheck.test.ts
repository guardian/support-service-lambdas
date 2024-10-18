import { handler } from '../../src/handlers/salesforceDisasterRecoveryHealthCheck';
import { publishSnsMessage } from '../../src/services/sns';
import {
	describeExecution,
	startExecution,
} from '../../src/services/step-functions';

jest.mock('../../src/services/sns');
jest.mock('../../src/services/step-functions');

describe('Handler', () => {
	const mockEnv = {
		APP: 'test-app',
		STAGE: 'CODE',
		REGION: 'eu-west-1',
		SNS_TOPIC_ARN: 'test-topic-arn',
		STATE_MACHINE_ARN: 'test-state-machine-arn',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...mockEnv };
		console.log = jest.fn();
		console.error = jest.fn();
	});

	it('should complete the health check successfully', async () => {
		(startExecution as jest.Mock).mockResolvedValue({
			executionArn: 'test-execution-arn',
		});
		(describeExecution as jest.Mock).mockResolvedValue({ status: 'SUCCEEDED' });

		const result: 'HEALTH CHECK PASSED' | 'HEALTH CHECK FAILED' =
			await handler();

		expect(result).toEqual('HEALTH CHECK PASSED');
		expect(publishSnsMessage).not.toHaveBeenCalled();
		expect(describeExecution).toHaveBeenCalledTimes(1);
		expect(startExecution).toHaveBeenCalled();
	});

	it('should handle the health check failure and notify via SNS', async () => {
		(startExecution as jest.Mock).mockResolvedValue({
			executionArn: 'test-execution-arn',
		});
		(describeExecution as jest.Mock).mockResolvedValue({ status: 'FAILED' });

		const result = await handler();

		expect(result).toEqual('HEALTH CHECK FAILED');
		expect(publishSnsMessage).toHaveBeenCalledTimes(1);
	});

	it('should handle unexpected errors during execution', async () => {
		const errorMessage = 'Test error';
		(startExecution as jest.Mock).mockRejectedValue(new Error(errorMessage));

		const result = await handler();

		expect(result).toEqual('HEALTH CHECK FAILED');
		expect(publishSnsMessage).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith(expect.any(Error));
	});

	it('should throw an error if required environment variables are not set', async () => {
		delete process.env.STAGE;

		await expect(handler()).rejects.toThrow(
			'STAGE environment variable not set',
		);
	});
});
