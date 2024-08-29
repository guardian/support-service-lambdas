import type { SQSEvent } from 'aws-lambda';
import fetchMock from 'fetch-mock';
import { handler } from '../src';
import type { HmacKey} from '../src/validateRequest';
import { maxValidTimeWindowSeconds  } from '../src/validateRequest';
import { validSQSRecord, validSQSRecordTimestamp } from './validateRequest.test';

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

test('userType 200', async () => {
    jest
    .useFakeTimers()
    .setSystemTime(new Date(validEpochSeconds * 1000)); //Date works in Epoch milli
	fetchMock.mock(
		'https://idapi.code.dev-theguardian.com/user/type/test111@test111.com',
		new Response(JSON.stringify({ userType: 'new' })),
	);

    fetchMock.mock(
		'https://idapi.code.dev-theguardian.com/guest?accountVerificationEmail=true',
		200,
	);
	await handler(sqsEvent);
});
