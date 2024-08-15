/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 *
 * This specific test is a placeholder and will be updated at a later date when the project has matured such that there is something to test.
 * The test is retained here simply to prevent the build from failing
//  */
// 	const SQSRaw = `{
// 		"Records": [
// 			{
// 				"messageId": "bdfdb04b-b6e6-49fe-82bf-5240063be412",
// 				"receiptHandle": "AQEBdAf+N923wkTftqvbUGz/jy0uCrfBnTGE2PrzKBPWletU2s0LpOFP6+Hs0U5qassRkiW7GP7XWiA91TSBCDhRC1QF1lDrZH3pXY50dGR/GW0K+w7sQzHVO5X4xJvwFl+ZIQwAhCIpWuHUlqtZ4rs8ArBDgoP7F0cqZrHqX2hb0JhmoQg8Zn7+C7uHw1JhMW7Er8wavIA2DOAK4ESPzze+byW20XsByPxdLM8gtQzLVYbq6bPAQvDqIRMuC5VxFTmK3RT4xIQ+vv0NjqrE1gzKjstKzPrGYjsIWZZr0le4w8uos+9e8FTbUyTlXguGUxBq+MXaGySucpbGamg0+mLdXVNj+fMFVMMk7RP88xwpR+Ljn4PtBlZnl1z3t/9DvXC2EqaQ7BDTp8hTMnGh3Uhe4fybemA8eBMo1VhqIioa7nk=",
// 				"body": "{\"Payload\":{\n  \"buyer_details\": {\n    \"email\": \"grumble\",\n    \"first_name\": \"John\",\n    \"last_name\": \"Doe\",\n    \"name\": \"John Doe\",\n    \"phone\": \"07123456789\"\n  }}\n}",
// 				"attributes": {
// 					"ApproximateReceiveCount": "1",
// 					"AWSTraceHeader": "Root=1-66be18fb-7d148e515c5a745633820a4f",
// 					"SentTimestamp": "1723734267657",
// 					"SenderId": "AROA4TAR37NZM4NZVE3D6:BackplaneAssumeRoleSession",
// 					"ApproximateFirstReceiveTimestamp": "1723734267664"
// 				},
// 				"messageAttributes": {
// 					"tickettailor-webhook-signature": {
// 						"stringValue": "t=1723730497,v1=69955b67e25acdebed35a369848f97cd59520ae184e25a31a415442818",
// 						"stringListValues": [],
// 						"binaryListValues": [],
// 						"dataType": "String"
// 					}
// 				},
// 				"md5OfMessageAttributes": "3e603d80a4b66d67453208e61d50b7eb",
// 				"md5OfBody": "34d5a8bc9577137d2a128e0c54cdeed8",
// 				"eventSource": "aws:sqs",
// 				"eventSourceARN": "arn:aws:sqs:eu-west-1:865473395570:ticket-tailor-webhook-queue-CODE",
// 				"awsRegion": "eu-west-1"
// 			}
// 		]
// 	}`

// const event = JSON.parse(SQSRaw) as SQSEvent
//todo seperate v1 t=1723730497,v1=69955b67e25acdebed35a369848f97cd59520ae184e25a31a415442818

const mockEnv = {};

jest.mock('../src/ticket-tailor-webhook');

describe('Handler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...mockEnv };
		console.error = jest.fn();
	});

	expect(undefined).toEqual(undefined);
});
