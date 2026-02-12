import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { z } from 'zod';

export class RequestLogger {
	private write: (key: string, group: GroupType) => void;
	constructor(
		private stage: Stage | 'DEV',
		write?: (key: string, group: GroupType) => void,
	) {
		console.log(`starting requestLogger in ${stage} mode`);
		this.write =
			write ??
			((client: S3Client) => async (key: string, group: GroupType) => {
				const command = new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					ContentType: 'application/json',
					Body: JSON.stringify(group),
				});
				return await client.send(command);
			})(new S3Client(awsConfig));
	}

	private coldStartFetch: LogRecord[] = [];
	private coldStart = false;
	private outgoingFetch: LogRecord[] | undefined;

	entry = (type: 'HANDLER' | 'COLD_START' | 'AWS' | 'HTTP' | 'FUNCTION') => {
		switch (type) {
			case 'HANDLER':
				this.setRequest();
				break;
			case 'COLD_START':
				this.coldStart = true;
				break;
		}
	};

	private setRequest = () => {
		console.log(`starting request`);
		if (this.outgoingFetch) {
			console.log('Error: request is already set');
		}
		this.outgoingFetch = [];
	};

	exit = async (
		type: 'HANDLER' | 'COLD_START' | 'AWS' | 'HTTP' | 'FUNCTION',
		request: unknown,
		response: unknown,
	) => {
		switch (type) {
			case 'HANDLER':
				// writes to S3 - could throw or be slow
				await this.setResponse(request, response);
				break;
			case 'COLD_START':
				this.coldStart = false;
				break;
			case 'HTTP':
			case 'AWS':
				this.addHttpCall(request, response);
				break;
		}
	};
	error = async (
		type: 'HANDLER' | 'COLD_START' | 'AWS' | 'HTTP' | 'FUNCTION',
		request: unknown,
		error: unknown,
	) => {
		// TODO how do we write errors?
	};
	setResponse = async (request: unknown, response: unknown) => {
		console.log(`finishing request`);
		if (this.outgoingFetch === undefined) {
			return Promise.reject(new Error('no request has been logged'));
		}
		const group: GroupType = {
			request,
			response,
			outgoingFetch: this.outgoingFetch,
			coldStartFetch: this.coldStartFetch, // goes on every invocation
		};
		this.outgoingFetch = undefined;

		const key = `${this.stage}/alarms-handler/${new Date().getTime()}.json`;

		console.log('\n\nwriting request logs to S3 as ' + key);

		this.write(key, group);
	};

	addHttpCall = (request: unknown, response: unknown) => {
		const fetchRecord: LogRecord = {
			request,
			response,
		};
		(this.coldStart ? this.coldStartFetch : this.outgoingFetch)?.push(
			fetchRecord,
		);
	};
}

const bucket = 'gu-reader-revenue-logs'; // expires after 14 days

type GroupType = z.infer<typeof groupSchema>;
type LogRecord = z.infer<typeof logRecordSchema>;
const logRecordSchema = z.object({
	request: z.unknown(),
	response: z.unknown(),
});
const groupSchema = z.object({
	outgoingFetch: z.array(logRecordSchema),
	coldStartFetch: z.array(logRecordSchema),
	request: z.unknown(),
	response: z.unknown(),
});
