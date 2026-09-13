import type { SQSEvent } from 'aws-lambda';
import { handler } from '../src';
import { handleIdentityDeletionEvent } from '../src/handlers/identityDeletionHandler';
import { defaultDependencies } from '../src/services';

jest.mock('../src/handlers/identityDeletionHandler', () => ({
	handleIdentityDeletionEvent: jest.fn(),
}));
jest.mock('../src/services', () => ({
	defaultDependencies: jest.fn(),
}));

describe('handler', () => {
	it('delegates each SQS event to the cleanup handler', async () => {
		const event = { Records: [] } as SQSEvent;

		await handler(event, {} as never, () => undefined);

		expect(handleIdentityDeletionEvent).toHaveBeenCalledWith(
			event,
			defaultDependencies,
		);
	});
});
