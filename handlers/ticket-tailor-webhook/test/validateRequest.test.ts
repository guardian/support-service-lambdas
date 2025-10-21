import type { HmacKey } from '../src/validateRequest';
import {
	getTimestampAndSignature,
	hasMatchingSignature,
	isWithinTimeWindow,
	maxValidTimeWindowSeconds,
	validateRequest,
} from '../src/validateRequest';
import {
	invalidSignatureSQSBody,
	invalidTimestampSQSBody,
	validSQSBody,
	validSQSRecordTimestamp,
} from './testFixtures';

const mockKey: HmacKey = {
	secret: '9dn189d53me1ania7d73a45d5de4674d',
};

jest.mock('@modules/secrets-manager/getSecret', () => ({
	getSecretValue: () => mockKey,
}));

beforeEach(() => {
	process.env.STAGE = 'CODE';
	jest.resetAllMocks();
	jest.mock('@modules/secrets-manager/getSecret', () => ({
		getSecretValue: () => mockKey,
	}));
});

const validSQSRecordSignature =
	'a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50';

const invalidTimestamp = '1724160027';
const invalidSignature =
	'a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd51';

//Tests for getTimestampAndSignature()
test('getTimestampAndSignature() called on an SQSRecord returns the correct values', () => {
	const timestampAndSignature = getTimestampAndSignature(validSQSBody);
	if (!timestampAndSignature) {
		throw new Error('Test Data missing timestamp and signature');
	}
	const [timestamp, signature]: [string, string] = timestampAndSignature;
	expect(timestamp).toBe('1724160026');
	expect(signature).toBe(
		'a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50',
	);
});

//Tests for hasMatchingSignature()
test('If the SQS event has a valid signature, hasMatchingSignature() will return true', () => {
	const signatureCheckResult = hasMatchingSignature(
		validSQSRecordTimestamp,
		validSQSRecordSignature,
		validSQSBody,
		mockKey,
	);

	expect(signatureCheckResult).toBe(true);
});

test('If the SQS event has an invalid signature, hasMatchingSignature() will log warning and return false', () => {
	const signatureCheckResult = hasMatchingSignature(
		validSQSRecordTimestamp,
		invalidSignature,
		invalidSignatureSQSBody,
		mockKey,
	);

	expect(signatureCheckResult).toBe(false);
});

test('If the SQS event has a valid signature but an invalid value for timestamp, hasMatchingSignature() will log warning and return false', () => {
	const signatureCheckResult = hasMatchingSignature(
		invalidTimestamp,
		validSQSRecordSignature,
		invalidTimestampSQSBody,
		mockKey,
	);

	expect(signatureCheckResult).toBe(false);
});

//Tests for isWithinTimeWindow()
test('If a valid SQS event has a timestamp that is just on the allowed time window, isWithinTimeWindow() will return true', () => {
	const currentTime = new Date();
	const currentEpochSeconds = Math.floor(currentTime.valueOf() / 1000);
	const validTimestamp = String(
		currentEpochSeconds - maxValidTimeWindowSeconds,
	);
	console.log(
		`currentEpochSeconds: ${currentEpochSeconds}, validTimeStamp: ${validTimestamp}`,
	);
	const withinTimeWindow = isWithinTimeWindow(
		maxValidTimeWindowSeconds,
		validTimestamp,
		currentTime,
	);

	expect(withinTimeWindow).toBe(true);
});

test('If a valid SQS event has a timestamp more than 1 second older than the allowed time window, isWithinTimeWindow() will log warning and return false', () => {
	const currentTime = new Date();
	const currentEpochSeconds = Math.ceil(currentTime.valueOf() / 1000);
	const invalidTimestamp = String(
		currentEpochSeconds - (maxValidTimeWindowSeconds + 2),
	);
	const withinTimeWindow = isWithinTimeWindow(
		maxValidTimeWindowSeconds,
		invalidTimestamp,
		currentTime,
	);

	expect(withinTimeWindow).toBe(false);
});

// Tests for the validateRequest function
const validEpochSeconds =
	Number(validSQSRecordTimestamp) + maxValidTimeWindowSeconds;
test('If a request has an invalid signature, validateRequest() will log warning and return false', async () => {
	jest.useFakeTimers().setSystemTime(new Date(validEpochSeconds * 1000)); //Date works in Epoch milli

	expect(await validateRequest(invalidSignatureSQSBody)).toBe(false);
});

test('If a request has a valid signature and timestamp, and the timestamp is within the allowed time window, validateRequest() will return true', async () => {
	jest.useFakeTimers().setSystemTime(new Date(validEpochSeconds * 1000)); //Date works in Epoch milli

	expect(await validateRequest(validSQSBody)).toBe(true);
});

const invalidEpochSeconds =
	Number(validSQSRecordTimestamp) + maxValidTimeWindowSeconds + 2;
test('If a request has a valid signature and timestamp, but the timestamp is more than 1 second outside the allowed time window, validateRequest() will return false', async () => {
	jest.useFakeTimers().setSystemTime(new Date(invalidEpochSeconds * 1000)); //Date works in Epoch milli

	expect(await validateRequest(validSQSBody)).toBe(false);
});

test('If a request has a valid signature and timestamp, but the timestamp is later than the current date, validateRequest() will return false', async () => {
	jest.useFakeTimers().setSystemTime(new Date(invalidEpochSeconds * 1000)); //Date works in Epoch milli

	expect(await validateRequest(validSQSBody)).toBe(false);
});
