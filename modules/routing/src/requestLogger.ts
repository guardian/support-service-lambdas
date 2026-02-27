import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { stageSchema } from '@modules/stage';
import { z } from 'zod';
import type { AsyncFunction } from '@modules/routing/logger';

export class RequestLogger {
	constructor(private stage: Stage | 'DEV') {
		log(`starting requestLogger in ${stage} mode`);
	}

	private coldStartFetch: LogRecord[] = [];
	private coldStart = false;
	private coldStartEnv: unknown = undefined;
	private outgoingFetch: LogRecord[] | undefined;

	/**
	 * set cold start mode to true to record any initialisation requests e.g. config/catalog loading.
	 *
	 * These requests will be retained and stored with every test record.
	 *
	 * @param isColdStart
	 * @param coldStartEnv
	 */
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

	wrapColdStart<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		regressionTestColdStartEnv: unknown,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			this.setColdStart(true, regressionTestColdStartEnv);
			try {
				// actually call the function
				return await fn(...args);
			} finally {
				this.setColdStart(false);
			}
		};
	}

	wrapOutgoingCall<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		regressionTestRequestKey: string,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			// actually call the function
			const result = await fn(...args);
			this.addOutgoingCall(regressionTestRequestKey, result);
			return result;
		};
	}

	wrapInvocation<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		regressionTestInput: unknown,
		// functionName: string | (() => string) = fn.name,
		// callerInfo: string = getCallerInfo(),
		// argsToLoggable: (args: TArgs) => LoggableInput,
		// responseToLoggable: (result: TReturn) => unknown = (result) => result,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			this.setRequest();
			try {
				// actually call the function
				const result = await fn(...args);
				await this.setResponse(regressionTestInput, result);
				return result;
			} catch (error) {
				await this.setResponse(regressionTestInput, error);
				throw error;
			}
		};
	}

	private setRequest = () => {
		log(`starting request`);
		if (this.outgoingFetch) {
			log('Error: request is already set');
		}
		this.outgoingFetch = [];
	};

	private setResponse = async (request: unknown, response: unknown) => {
		log(`finishing request`);
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

		await write(key, group).then(log).catch(console.error);
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

/**
 * we have to use an internal logger rather than the normal one, to avoid a circular dependency
 */
function log(message: unknown) {
	console.log(`requestLogger:`, message);
}

const bucket = 'gu-reader-revenue-logs'; // expires after 14 days

async function write(key: string, group: GroupType) {
	log('\n\nwriting request logs to S3:');
	log(
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
		log(`buildSingletonLogger in stage ${parsedStage.data}`);
		const requestLogger = parsedStage.success
			? new RequestLogger(parsedStage.data)
			: undefined;
		return requestLogger;
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
