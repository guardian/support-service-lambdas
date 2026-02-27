import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { stageSchema } from '@modules/stage';
import { z } from 'zod';

export class RequestLogger {
	private write: (key: string, group: GroupType) => Promise<void>;
	constructor(
		private stage: Stage | 'DEV',
		write?: (key: string, group: GroupType) => Promise<void>,
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
				await client.send(command);
			})(new S3Client(awsConfig));
	}

	private coldStartFetch: LogRecord[] = [];
	private coldStart = false;
	private coldStartEnv: unknown = undefined;
	private outgoingFetch: LogRecord[] | undefined;

	setColdStart = (isColdStart: boolean, coldStartEnv?: unknown) => {
		if (isColdStart) {
			if (this.coldStartEnv !== undefined) {
				console.error(
					new Error('multiple cold starts - test may not be recorded properly'),
				);
			}
			this.coldStartEnv = coldStartEnv;
		}
		this.coldStart = isColdStart;
	};

	setRequest = () => {
		console.log(`starting request`);
		if (this.outgoingFetch) {
			console.log('Error: request is already set');
		}
		this.outgoingFetch = [];
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
			coldStartFetch: this.coldStartFetch, // cold start must be attached to every invocation
			coldStartEnv: this.coldStartEnv,
		};
		this.outgoingFetch = undefined;

		const key = `${this.stage}/alarms-handler/${new Date().getTime()}.json`;

		console.log('\n\nwriting request logs to S3:');
		console.log(
			`https://eu-west-1.console.aws.amazon.com/s3/object/${bucket}?region=eu-west-1&prefix=${key}`,
		);

		await this.write(key, group).then(console.log).catch(console.error);
	};

	addOutgoingCall = (requestKey: string, response: unknown) => {
		const fetchRecord: LogRecord = {
			requestKey,
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
	requestKey: z.string(),
	response: z.unknown(),
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- will be needed to read the values back in later
const groupSchema = z.object({
	outgoingFetch: z.array(logRecordSchema),
	coldStartFetch: z.array(logRecordSchema),
	coldStartEnv: z.unknown(),
	request: z.unknown(),
	response: z.unknown(),
});

function buildRequestLogger() {
	try {
		const parsedStage = stageSchema.safeParse(process.env.STAGE);
		console.log(`buildSingletonLogger in stage ${parsedStage.data}`);
		const requestLogger = parsedStage.success
			? new RequestLogger(parsedStage.data)
			: undefined;
		return requestLogger;
	} catch {
		return undefined; // mainly because tests don't mock it properly
	}
}

export const requestLogger: RequestLogger | undefined = buildRequestLogger();
