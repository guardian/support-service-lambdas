import type { SQSRecord } from 'aws-lambda';
import type { ApiGatewayToSqsEvent } from '../src/apiGatewayToSqsEvent';

export const emailAddress = `test111@test111.com`;

const validBody = `{"id":"wh_1072228","created_at":"2024-08-20 13:20:26","event":"ORDER.CREATED","resource_url":"https:\\/\\/api.tickettailor.com\\/v1\\/orders\\/or_46629271","payload":{"object":"order","id":"or_46629271","buyer_details":{"address":{"address_1":null,"address_2":null,"address_3":null,"postal_code":null},"custom_questions":[],"email":"${emailAddress}","first_name":"joe&^","last_name":"griffiths%","name":"joe&^ griffiths%","phone":null},"created_at":1724160016,"credited_out_amount":0,"currency":{"base_multiplier":100,"code":"gbp"},"event_summary":{"id":"ev_4467889","end_date":{"date":"2024-12-13","formatted":"Fri 13 Dec 2024 10:30 PM","iso":"2024-12-13T22:30:00+00:00","time":"22:30","timezone":"+00:00","unix":1734129000},"event_id":"ev_4467889","event_series_id":"es_1354460","name":"CODE","start_date":{"date":"2024-08-28","formatted":"Wed 28 Aug 2024 6:00 PM","iso":"2024-08-28T18:00:00+01:00","time":"18:00","timezone":"+01:00","unix":1724864400},"venue":{"name":null,"postal_code":null}},"issued_tickets":[{"object":"issued_ticket","id":"it_72697654","add_on_id":null,"barcode":"R59xesv","barcode_url":"https:\\/\\/cdn.tickettailor.com\\/userfiles\\/cache\\/barcode\\/st\\/attendee\\/72697654\\/ef31abaf2ddf8d484483.jpg","checked_in":"false","created_at":1724160026,"custom_questions":[],"description":"General Admission","email":"test111@test111.com","event_id":"ev_4467889","event_series_id":"es_1354460","first_name":"joe&^","full_name":"joe&^ griffiths%","group_ticket_barcode":null,"last_name":"griffiths%","order_id":"or_46629271","qr_code_url":"https:\\/\\/cdn.tickettailor.com\\/userfiles\\/cache\\/barcode\\/qr\\/attendee\\/72697654\\/9ef2823a01c811da7614.png","reference":null,"reservation":null,"source":"checkout","status":"valid","ticket_type_id":"tt_4328701","updated_at":1724160026,"voided_at":null}],"line_items":[{"object":"line_item","id":"li_96505270","booking_fee":0,"description":"General Admission","item_id":"tt_4328701","quantity":1,"total":0,"type":"ticket","value":0}],"marketing_opt_in":null,"meta_data":[],"payment_method":{"external_id":null,"id":null,"instructions":null,"name":null,"type":"no_cost"},"referral_tag":null,"refund_amount":0,"refunded_voucher_id":null,"status":"completed","status_message":null,"subtotal":0,"tax":0,"tax_treatment":"exclusive","total":0,"total_paid":0,"txn_id":"--"}}`;

export const validSQSRecord: SQSRecord = {
	messageId: '48501d06-2c1d-4e06-80b9-7617cd9df313',
	receiptHandle:
		'AQEBGUe76PwvIArSCNuXCG04UxR2lalLsc/EqwapLeQdUAz2MsV3D4erYZ7W61kQsx3b1N7wQKVYnWEqa84sZ/JtTNh14oJ98qAoUPNjd4MsQ1FU1LpK2SjliUYT4M8jv3PAVcshzPhN6a7uj1HK54QZZPTmrlu888GpBmdyMYWbJH4oD5xxA8U1CeCMGtLOlhIFdbwxK8sVzQVgfw+ABvMgdnYgl4+M6BTj72EVF7Ce4uUBa6Tg3AiCLYonyeNbut/oSgvT9Gv1gPkGquX/B1ZXmNnP8NZwx9EqMi1i2Mhf+Mr57q4qy3540ZI5+/iRfCt7nKPZrWBbpDBgeOV9cwPlxuTiNdWQSO3gA4Y20OtxXaLJ42H+wpqc75nUTEb63OuBEripC48lJv3lSDiVYqPiFGX44JUClPqh0v7vQoDQXpQ=',
	body: JSON.stringify({
		body: validBody,
		headers: {
			'tickettailor-webhook-signature':
				't=1724160026,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50',
		},
		pathParameters: {},
		queryStringParameters: {},
		httpMethod: '',
		path: '',
	} as ApiGatewayToSqsEvent),
	attributes: {
		ApproximateReceiveCount: '1',
		AWSTraceHeader: 'Root=1-66c35630-058f68030b77da7b36b3a909',
		SentTimestamp: '1724077616681',
		SenderId: 'AROA4TAR37NZM4NZVE3D6:BackplaneAssumeRoleSession',
		ApproximateFirstReceiveTimestamp: '1724077616692',
	},
	messageAttributes: {},
	md5OfBody: 'f76fca7a395b41f1dd0d9af3b1755ac1',
	eventSource: 'aws:sqs',
	eventSourceARN:
		'arn:aws:sqs:eu-west-1:865473395570:ticket-tailor-webhook-queue-CODE',
	awsRegion: 'eu-west-1',
};

export const validSQSBody: ApiGatewayToSqsEvent = {
	body: validBody,
	headers: {
		'tickettailor-webhook-signature':
			't=1724160026,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50',
	},
	pathParameters: {},
	queryStringParameters: {},
	httpMethod: '',
	path: '',
};

export const invalidSignatureSQSBody: ApiGatewayToSqsEvent = {
	body: validBody,
	headers: {
		'tickettailor-webhook-signature':
			't=1724160026,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd51',
	},
	pathParameters: {},
	queryStringParameters: {},
	httpMethod: '',
	path: '',
};

export const invalidTimestampSQSBody: ApiGatewayToSqsEvent = {
	body: validBody,
	headers: {
		'tickettailor-webhook-signature':
			't=1724160027,v1=a3dbd8cfb0f04a0a9b0dd9d2547f1dd1a51e60d528a4edaee3bc02085517bd50',
	},
	pathParameters: {},
	queryStringParameters: {},
	httpMethod: '',
	path: '',
};

export const validSQSRecordTimestamp = '1724160026';
