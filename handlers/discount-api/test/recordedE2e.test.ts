/**
 * @group integration
 */
import { handler, routeRequest } from '../src';
import { getKeys, RequestPlayback } from '@modules/zuora/requestLogger';

async function testSingle(requestPlayback: RequestPlayback) {
	const response = await routeRequest(
		JSON.parse(requestPlayback.request),
		requestPlayback,
	);
	console.log(
		`Response for ${requestPlayback.message} is ${response.statusCode}\n${response.body}`,
	);
	expect(response.statusCode).toEqual(requestPlayback.response.statusCode);
	expect(response.body).toEqual(requestPlayback.response.body);
}
test('call the lambda with all recorded data', async () => {
	const keys = await getKeys('DEV');
	for (const key of keys) {
		const requestPlayback = await RequestPlayback.loadKey(key);
		await testSingle(requestPlayback);
	}
});

test('call the lambda with recorded data', async () => {
	// load data from s3
	const requestPlayback = await RequestPlayback.load('DEV', '1721227406524');
	await testSingle(requestPlayback);
});

test('call the lambda to record data - preview', async () => {
	const testDataObject = JSON.parse(previewTestData);
	// const expected = '';
	const response = await handler(testDataObject);
	expect(response.statusCode).toEqual(200);
	expect(response.body).toEqual(expectedBody);
}, 30000);

test('call the lambda to record data - apply', async () => {
	const testDataObject = JSON.parse(applyTestData);
	// const expected = '';
	const response = await handler(testDataObject);
	expect(response.statusCode).toEqual(200);
	expect(response.body).toEqual(
		'{"nextNonDiscountedPaymentDate":"2024-10-16"}',
	);
}, 30000);

const subscriptionNumber = 'A-S00904942';
const identityId = '200275381';
const previewTestData = `{
    "path": "/preview-discount",
    "httpMethod": "POST",
    "headers": {
        "Content-Type": "application/json",
        "x-identity-id": "${identityId}"
    },
    "body": "{\\n    \\"subscriptionNumber\\": \\"${subscriptionNumber}\\"\\n}"
}`;

const applyTestData = `{
    "path": "/apply-discount",
    "httpMethod": "POST",
    "headers": {
        "Content-Type": "application/json",
        "x-identity-id": "${identityId}"
    },
    "body": "{\\n    \\"subscriptionNumber\\": \\"${subscriptionNumber}\\"\\n}"
}`;

const expectedBody = `{"discountedPrice":0,"upToPeriods":2,"upToPeriodsType":"Months","firstDiscountedPaymentDate":"2024-08-16","nextNonDiscountedPaymentDate":"2024-10-16"}`;
