import { SQSRecord } from 'aws-lambda';
import {
	hasMatchingSignature,
	isWithinTimeWindow,
	validateRequest,
	maxValidTimeWindowSeconds,
	getTimestampAndSignature,
} from '../src/validateRequest';
import type { HmacKey } from '../src/index';

/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 * WARNING: Do not alter key or mock records in this file as it will stop the test from working.
 */

const mockKey: HmacKey = {
	secret: '9dn189d53me1ania7d73a45d5de4674d',
};

const validSQSRecord: SQSRecord = {
	messageId: '48501d06-2c1d-4e06-80b9-7617cd9df313',
	receiptHandle:
		'AQEBGUe76PwvIArSCNuXCG04UxR2lalLsc/EqwapLeQdUAz2MsV3D4erYZ7W61kQsx3b1N7wQKVYnWEqa84sZ/JtTNh14oJ98qAoUPNjd4MsQ1FU1LpK2SjliUYT4M8jv3PAVcshzPhN6a7uj1HK54QZZPTmrlu888GpBmdyMYWbJH4oD5xxA8U1CeCMGtLOlhIFdbwxK8sVzQVgfw+ABvMgdnYgl4+M6BTj72EVF7Ce4uUBa6Tg3AiCLYonyeNbut/oSgvT9Gv1gPkGquX/B1ZXmNnP8NZwx9EqMi1i2Mhf+Mr57q4qy3540ZI5+/iRfCt7nKPZrWBbpDBgeOV9cwPlxuTiNdWQSO3gA4Y20OtxXaLJ42H+wpqc75nUTEb63OuBEripC48lJv3lSDiVYqPiFGX44JUClPqh0v7vQoDQXpQ=',
	body: `{"id":"wh_1072228","created_at":"2024-08-20 13:20:26","event":"ORDER.CREATED","resource_url":"https:\\/\\/api.tickettailor.com\\/v1\\/orders\\/or_46629271","payload":{"object":"order","id":"or_46629271","buyer_details":{"address":{"address_1":null,"address_2":null,"address_3":null,"postal_code":null},"custom_questions":[],"email":"test111@test111.com","first_name":"joe&^","last_name":"griffiths%","name":"joe&^ griffiths%","phone":null},"created_at":1724160016,"credited_out_amount":0,"currency":{"base_multiplier":100,"code":"gbp"},"event_summary":{"id":"ev_4467889","end_date":{"date":"2024-12-13","formatted":"Fri 13 Dec 2024 10:30 PM","iso":"2024-12-13T22:30:00+00:00","time":"22:30","timezone":"+00:00","unix":1734129000},"event_id":"ev_4467889","event_series_id":"es_1354460","name":"CODE","start_date":{"date":"2024-08-28","formatted":"Wed 28 Aug 2024 6:00 PM","iso":"2024-08-28T18:00:00+01:00","time":"18:00","timezone":"+01:00","unix":1724864400},"venue":{"name":null,"postal_code":null}},"issued_tickets":[{"object":"issued_ticket","id":"it_72697654","add_on_id":null,"barcode":"R59xesv","barcode_url":"https:\\/\\/cdn.tickettailor.com\\/userfiles\\/cache\\/barcode\\/st\\/attendee\\/72697654\\/ef31abaf2ddf8d484483.jpg","checked_in":"false","created_at":1724160026,"custom_questions":[],"description":"General Admission","email":"test111@test111.com","event_id":"ev_4467889","event_series_id":"es_1354460","first_name":"joe&^","full_name":"joe&^ griffiths%","group_ticket_barcode":null,"last_name":"griffiths%","order_id":"or_46629271","qr_code_url":"https:\\/\\/cdn.tickettailor.com\\/userfiles\\/cache\\/barcode\\/qr\\/attendee\\/72697654\\/9ef2823a01c811da7614.png","reference":null,"reservation":null,"source":"checkout","status":"valid","ticket_type_id":"tt_4328701","updated_at":1724160026,"voided_at":null}],"line_items":[{"object":"line_item","id":"li_96505270","booking_fee":0,"description":"General Admission","item_id":"tt_4328701","quantity":1,"total":0,"type":"ticket","value":0}],"marketing_opt_in":null,"meta_data":[],"payment_method":{"external_id":null,"id":null,"instructions":null,"name":null,"type":"no_cost"},"referral_tag":null,"refund_amount":0,"refunded_voucher_id":null,"status":"completed","status_message":null,"subtotal":0,"tax":0,"tax_treatment":"exclusive","total":0,"total_paid":0,"txn_id":"--"}}`,
	attributes: {
		ApproximateReceiveCount: '1',
		AWSTraceHeader: 'Root=1-66c35630-058f68030b77da7b36b3a909',
		SentTimestamp: '1724077616681',
		SenderId: 'AROA4TAR37NZM4NZVE3D6:BackplaneAssumeRoleSession',
		ApproximateFirstReceiveTimestamp: '1724077616692',
	},
	messageAttributes: {
		'tickettailor-webhook-signature': {
			stringValue:
				't=1724160026,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50',
			stringListValues: [],
			binaryListValues: [],
			dataType: 'String',
		},
	},
	md5OfBody: 'f76fca7a395b41f1dd0d9af3b1755ac1',
	eventSource: 'aws:sqs',
	eventSourceARN:
		'arn:aws:sqs:eu-west-1:865473395570:ticket-tailor-webhook-queue-CODE',
	awsRegion: 'eu-west-1',
};

const invalidSignatureSQSRecord = {
	messageId: validSQSRecord.messageId,
	receiptHandle: validSQSRecord.receiptHandle,
	body: validSQSRecord.body,
	attributes: validSQSRecord.attributes,
	messageAttributes: {
		'tickettailor-webhook-signature': {
			//modified the signature to be one higher than the original this is sufficient to make it invalid
			stringValue:
				't=1724160026,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd51',
			stringListValues: [],
			binaryListValues: [],
			dataType: 'String',
		},
	},
	md5OfBody: validSQSRecord.md5OfBody,
	eventSource: validSQSRecord.eventSource,
	eventSourceARN: validSQSRecord.eventSourceARN,
	awsRegion: validSQSRecord.awsRegion,
};

const invalidTimestampSQSRecord = {
	messageId: validSQSRecord.messageId,
	receiptHandle: validSQSRecord.receiptHandle,
	body: validSQSRecord.body,
	attributes: validSQSRecord.attributes,
	messageAttributes: {
		'tickettailor-webhook-signature': {
			//modified the signature to be one higher than the original this is sufficient to make it invalid
			stringValue:
				't=1724160027,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50',
			stringListValues: [],
			binaryListValues: [],
			dataType: 'String',
		},
	},
	md5OfBody: validSQSRecord.md5OfBody,
	eventSource: validSQSRecord.eventSource,
	eventSourceARN: validSQSRecord.eventSourceARN,
	awsRegion: validSQSRecord.awsRegion,
};

const validSQSRecordTimestamp = '1724160026';
const validSQSRecordSignature =
	'a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50';

const invalidTimestamp = '1724160027';
const invalidSignature =
	'a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd51';

//Tests for getTimestampAndSignature()
test('getTimestampAndSignature() called on an SQSRecord returns the correct values', () => {
	const timestampAndSignature = getTimestampAndSignature(validSQSRecord);
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
		validSQSRecord,
		mockKey,
	);

	expect(signatureCheckResult).toBe(true);
});

test('If the SQS event has an invalid signature, hasMatchingSignature() will log warning and return false', () => {
	const signatureCheckResult = hasMatchingSignature(
		validSQSRecordTimestamp,
		invalidSignature,
		invalidSignatureSQSRecord,
		mockKey,
	);

	expect(signatureCheckResult).toBe(false);
});

test('If the SQS event has a valid signature but an invalid value for timestamp, hasMatchingSignature() will log warning and return false', () => {
	const signatureCheckResult = hasMatchingSignature(
		invalidTimestamp,
		validSQSRecordSignature,
		invalidTimestampSQSRecord,
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
test('If a request has an invalid signature, validateRequest() will log warning and return false', () => {
	const validEpochSeconds =
		Number(validSQSRecordTimestamp) + maxValidTimeWindowSeconds;
	//Date works in Epoch milli
	const validDate = new Date(validEpochSeconds * 1000);
	console.log(
		`validSQSRecordTimestamp: ${validSQSRecordTimestamp}..... validEpochSeconds: ${validEpochSeconds} ...  validDate: ${Math.round(validDate.valueOf() / 1000)}`,
	);

	expect(validateRequest(invalidSignatureSQSRecord, mockKey, validDate)).toBe(
		false,
	);
});

test('If a request has a valid signature and timestamp, and the timestamp is within the allowed time window, validateRequest() will return true', () => {
	const validEpochSeconds =
		Number(validSQSRecordTimestamp) + maxValidTimeWindowSeconds;
	//Date works in Epoch milli
	const validDate = new Date(validEpochSeconds * 1000);
	console.log(
		`validSQSRecordTimestamp: ${validSQSRecordTimestamp}..... validEpochSeconds: ${validEpochSeconds} ...  validDate: ${Math.round(validDate.valueOf() / 1000)}`,
	);

	expect(validateRequest(validSQSRecord, mockKey, validDate)).toBe(true);
});

test('If a request has a valid signature and timestamp, but the timestamp is more than 1 second outside the allowed time window, validateRequest() will return false', () => {
	const invalidEpochSeconds =
		Number(validSQSRecordTimestamp) + maxValidTimeWindowSeconds + 2;
	//Date works in Epoch milli
	const invalidDate = new Date(invalidEpochSeconds * 1000);

	expect(validateRequest(validSQSRecord, mockKey, invalidDate)).toBe(false);
});

test('If a request has a valid signature and timestamp, but the timestamp is later than the current date, validateRequest() will return false', () => {
	const invalidEpochSeconds = Number(validSQSRecordTimestamp) - 2;
	//Date works in Epoch milli
	const invalidDate = new Date(invalidEpochSeconds * 1000);

	expect(validateRequest(validSQSRecord, mockKey, invalidDate)).toBe(false);
});
