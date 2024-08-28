import type { SQSEvent } from 'aws-lambda';
import fetchMock from 'fetch-mock';
import type { HmacKey } from '../src';
import { handler } from '../src';
import { validSQSRecord } from './validateRequest.test';

const sqsEvent: SQSEvent = { Records: [validSQSRecord] };

const mockKey: HmacKey = {
	secret: '9dn189d53me1ania7d73a45d5de4674d',
};

jest.mock('@modules/secrets-manager/src/getSecret', () => ({
	getSecretValue: () => mockKey,
}));

beforeEach(() => {
	process.env.Stage = 'CODE';
	fetchMock.restore();
});

test('userType 200', async () => {
	fetchMock.mock(
		'https://idapi.code.dev-theguardian.com/user/type/',
		new Response(JSON.stringify({ userType: 'new' })),
	);
	await handler(sqsEvent);
});
