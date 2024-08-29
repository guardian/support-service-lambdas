import type { SQSEvent } from 'aws-lambda';
import fetchMock from 'fetch-mock';
import { handler } from '../src';
import type { HmacKey } from '../src/validateRequest';
import { maxValidTimeWindowSeconds } from '../src/validateRequest';
import {
	emailAddress,
	validSQSRecord,
	validSQSRecordTimestamp,
} from './testFixtures';

const sqsEvent: SQSEvent = { Records: [validSQSRecord] };

const mockKey: HmacKey = {
	secret: '9dn189d53me1ania7d73a45d5de4674d',
};

jest.mock('@modules/secrets-manager/src/getSecret', () => ({
	getSecretValue: () => mockKey,
}));

const validEpochSeconds =
	Number(validSQSRecordTimestamp) + maxValidTimeWindowSeconds;

beforeEach(() => {
	process.env.Stage = 'CODE';
	fetchMock.restore();
});

test('calls create guest account for new email addresses', async () => {
	jest.useFakeTimers().setSystemTime(new Date(validEpochSeconds * 1000)); //Date works in Epoch milli
	fetchMock.mock(
		`https://idapi.code.dev-theguardian.com/user/type/${emailAddress}`,
		new Response(JSON.stringify({ userType: 'new' })),
	);

	fetchMock.mock(
		{
			url: 'https://idapi.code.dev-theguardian.com/guest?accountVerificationEmail=true',
			body: { primaryEmailAddress: emailAddress },
			method: 'POST',
		},
		200,
	);

	await handler(sqsEvent);
	expect(
		fetchMock.called(
			`https://idapi.code.dev-theguardian.com/user/type/${emailAddress}`,
		),
	).toBe(true);
	expect(
		fetchMock.called(
			'https://idapi.code.dev-theguardian.com/guest?accountVerificationEmail=true',
		),
	).toBe(true);
});

test('no call to create guest account for an existing email addresses', async () => {
	jest.useFakeTimers().setSystemTime(new Date(validEpochSeconds * 1000)); //Date works in Epoch milli
	fetchMock.mock(
		`https://idapi.code.dev-theguardian.com/user/type/${emailAddress}`,
		new Response(JSON.stringify({ userType: 'current' })),
	);

	await handler(sqsEvent);
	expect(
		fetchMock.called(
			`https://idapi.code.dev-theguardian.com/user/type/${emailAddress}`,
		),
	).toBe(true);
	expect(
		fetchMock.called(
			'https://idapi.code.dev-theguardian.com/guest?accountVerificationEmail=true',
		),
	).toBe(false);
});
