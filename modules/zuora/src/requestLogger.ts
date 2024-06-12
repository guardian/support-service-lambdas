import type { Stage } from '@modules/stage';
import {
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import { z } from 'zod';

const client = new S3Client(awsConfig);

export interface FetchInterface {
	execute: (input: string, init: RequestData) => Promise<RecordedResponse>;
}

export class PassThrough implements FetchInterface {
	execute = async (
		input: string,
		init: RequestData,
	): Promise<RecordedResponse> => {
		return await executeUnderlying(input, init);
	};
}

async function executeUnderlying(input: string, init: RequestData) {
	const response = await fetch(input, init);
	const text = await response.text();
	let headers = {};
	response.headers.forEach((value, key) => {
		headers = { ...headers, [key]: value };
	});
	const responseJson: RecordedResponse = {
		ok: response.ok,
		text: text,
		status: response.status,
		statusText: response.statusText,
		headers,
	};
	return responseJson;
}

export class RequestLogger implements FetchInterface {
	constructor(private stage: Stage | 'DEV') {}

	outgoingFetch: LogRecord[] = [];
	request?: string;

	setRequest = (request: string) => {
		if (this.request) console.log('Error: request is already set');
		this.request = request;
	};

	setResponse = async (response: ResponseData) => {
		if (!this.request) return Promise.reject('no request has been logged');
		const group: GroupType = {
			request: this.request,
			response,
			outgoingFetch: this.outgoingFetch,
		};

		const key = `${this.stage}/discount-api/${new Date().getTime()}.json`;

		console.log('writing request logs to S3 as ' + key);

		const command = new PutObjectCommand({
			Bucket: 'gu-reader-revenue-logs', // expires after 14 days
			Key: key,
			ContentType: 'application/json',
			Body: JSON.stringify(group),
		});
		await client.send(command);
	};

	// this does a real fetch and then stores the incoming/outgoing data
	execute = async (
		input: string,
		init: RequestData,
	): Promise<RecordedResponse> => {
		const responseJson = await executeUnderlying(input, init);
		const fetchRecord: LogRecord = {
			request: { input, init },
			response: responseJson,
		};
		this.outgoingFetch.push(fetchRecord);
		return responseJson;
	};
}

const bucket = 'gu-reader-revenue-logs'; // expires after 14 days

export const getKeys = async (stage: string) => {
	const command = new ListObjectsV2Command({
		// ListObjectsRequest
		Bucket: bucket,
		Prefix: baseKey(stage),
	});
	const s3Result = await client.send(command);
	if (s3Result.IsTruncated) {
		console.log(
			'*** warning - more than 1000 results, please use pagination ***',
		);
	}
	if (!s3Result.Contents) return [];
	const s3Keys: string[] = s3Result.Contents.flatMap((value) =>
		value.Key ? [value.Key] : [],
	);
	return s3Keys;
};

function baseKey(stage: string) {
	return `${stage}/discount-api/`;
}

export class RequestPlayback implements FetchInterface {
	static async load(stage: string, dataId: string) {
		const key = baseKey(stage) + `${dataId}.json`;
		return await RequestPlayback.loadKey(key);
	}

	static async loadKey(key: string) {
		console.log(`creating fake http fetch client`);

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		});
		const s3Result = await client.send(command);
		const body = await s3Result.Body?.transformToString();
		if (!body) {
			throw new Error(
				'Response body was undefined when fetching the Catalog from S3',
			);
		}
		const { request, response, outgoingFetch } = groupSchema.parse(
			JSON.parse(body),
		);
		return new RequestPlayback(request, response, outgoingFetch, key);
	}

	constructor(
		public request: string,
		public response: ResponseData,
		private recordedData: LogRecord[],
		public message: string,
	) {}

	mkString = (input: Record<string, string> | undefined) => {
		let accu = '';
		if (input) {
			for (let key in input) {
				accu = accu + key + input[key];
			}
		}
		return accu;
	};

	// this is a dummy fetch from the records
	execute = async (
		input: string,
		init: RequestData,
	): Promise<RecordedResponse> => {
		const maybeResponse = this.recordedData.find(({ request }) => {
			return (
				request.input === input &&
				this.mkString(init.headers) === this.mkString(request.init.headers) &&
				init.method === request.init.method &&
				init.body === request.init.body
			);
		})?.response;
		return maybeResponse
			? Promise.resolve(maybeResponse)
			: Promise.reject(
					"couldn't find a response\n" +
						`searching for: ${input}\n${JSON.stringify(init)}`,
				);
	};
}

type GroupType = z.infer<typeof groupSchema>;
type LogRecord = GroupType['outgoingFetch'][number];
type RequestData = LogRecord['request']['init'];
type ResponseData = GroupType['response'];
type RecordedResponse = LogRecord['response'];
const groupSchema = z.object({
	outgoingFetch: z.array(
		z.object({
			request: z.object({
				input: z.string(),
				init: z.object({
					method: z.string(),
					body: z.optional(z.string()),
					headers: z.optional(z.record(z.string(), z.string())),
				}),
			}),
			response: z.object({
				headers: z.record(z.string(), z.string()),
				statusText: z.string(),
				text: z.string(),
				ok: z.boolean(),
				status: z.number(),
			}),
		}),
	),
	request: z.string(),
	response: z.object({ statusCode: z.number(), body: z.string() }),
});
