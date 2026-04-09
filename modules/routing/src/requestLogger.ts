import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { stageSchema } from '@modules/stage';
import { z } from 'zod';
import type { AsyncFunction } from '@modules/routing/logger';
import { logger } from '@modules/routing/logger';

export class RequestLogger {
	constructor(private stage: Stage | 'DEV') {}

	private coldStartInput: unknown = undefined;
	private coldStartFetches: LogRecord[] = [];
	private inColdStart = false;

	private outgoingFetches: LogRecord[] | undefined;

	/**
	 * set cold start mode to true to record any initialisation requests e.g. config/catalog loading.
	 *
	 * These requests will be retained and stored with every test record.
	 *
	 * @param fn
	 * @param coldStartEnv
	 */
	wrapColdStart<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		coldStartEnv: unknown,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			this.inColdStart = true;
			if (this.coldStartInput !== undefined) {
				console.error(
					new Error('multiple cold starts - test may not be recorded properly'),
				);
			}
			this.coldStartInput = coldStartEnv;
			try {
				// actually call the function
				return await fn(...args);
			} finally {
				this.inColdStart = false;
			}
		};
	}

	wrapInvocation<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		input: unknown,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			this.setRequest();
			try {
				// actually call the function
				const result = await fn(...args);
				await this.setResponse(input, result);
				return result;
			} catch (error) {
				await this.setResponse(input, error);
				throw error;
			}
		};
	}

	private setRequest = () => {
		logger.log(`starting request`);
		if (this.outgoingFetches) {
			logger.log('warning: request is already set');
		}
		this.outgoingFetches = [];
	};

	private setResponse = async (request: unknown, response: unknown) => {
		logger.log(`finishing request`);
		if (this.outgoingFetches === undefined) {
			return Promise.reject(new Error('no request has been logged'));
		}
		const group: GroupType = {
			request,
			response,
			outgoingFetch: this.outgoingFetches,
			coldStartFetch: this.coldStartFetches, // cold start must be attached to every invocation
			coldStartEnv: this.coldStartInput,
		};
		this.outgoingFetches = undefined;

		const key = `${this.stage}/alarms-handler/${new Date().getTime()}.json`;

		await writeGroupToS3(key, group)
			.then(logger.log.bind(logger))
			.catch(console.error);
	};

	wrapOutgoingCall<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		requestKey: string,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			// actually call the function
			const response = await fn(...args);
			// TODO when needed - catch and store exceptions
			this.addOutgoingCall(requestKey, response);
			return response;
		};
	}

	private addOutgoingCall = (requestKey: string, response: unknown) => {
		const fetchRecord: LogRecord = {
			requestKey,
			response,
		};
		(this.inColdStart ? this.coldStartFetches : this.outgoingFetches)?.push(
			fetchRecord,
		);
	};
}

const bucket = 'gu-reader-revenue-logs'; // expires after 14 days

async function writeGroupToS3(key: string, group: GroupType) {
	logger.log('\n\nwriting request logs to S3:');
	logger.log(
		`https://eu-west-1.console.aws.amazon.com/s3/object/${bucket}?region=eu-west-1&prefix=${key}`,
	);

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: 'application/json',
		Body: JSON.stringify(group),
	});
	await new S3Client(awsConfig).send(command);
}

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
		return parsedStage.success
			? new RequestLogger(parsedStage.data)
			: undefined;
	} catch {
		return undefined; // mainly because tests don't mock stageSchema properly
	}
}

const requestLogger: RequestLogger | undefined = buildRequestLogger();

export type RegressionLoggableInput = {
	type?: 'handler' | 'coldStart' | 'outgoingRequest';
} & (
	| {
			type: 'handler';
			/**
			 * if this is set, the function input and output are stored as a new regression test
			 */
			regressionTestInput: unknown;
	  }
	| {
			type: 'coldStart';
			/**
			 * if this is set, the function input and output are stored as cold start data
			 */
			regressionTestColdStartEnv: unknown;
	  }
	| {
			type: 'outgoingRequest';
			/**
			 * if this is set, the function input and output are stored as request data
			 */
			regressionTestRequestKey: string;
	  }
);

export function wrapRegressionTestLogging<TArgs extends unknown[], TReturn>(
	fn: AsyncFunction<TArgs, TReturn>,
	loggableInput: RegressionLoggableInput,
): AsyncFunction<TArgs, TReturn> {
	if (requestLogger === undefined) {
		return fn;
	} else {
		switch (loggableInput.type) {
			case 'handler':
				return requestLogger.wrapInvocation(
					fn,
					loggableInput.regressionTestInput,
				);
			case 'coldStart':
				return requestLogger.wrapColdStart(
					fn,
					loggableInput.regressionTestColdStartEnv,
				);
			case 'outgoingRequest':
				return requestLogger.wrapOutgoingCall(
					fn,
					loggableInput.regressionTestRequestKey,
				);
		}
	}
}
