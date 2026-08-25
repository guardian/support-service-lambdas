import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { OrderRequest } from './orderRequests';

const pollIntervalInMilliseconds = 2_000;
const readTimeoutInMilliseconds = 120_000;
const lockingContentionRetryDelayInMilliseconds = 60_000;
const lockingContentionCode = '[40000050]';

const asyncOrderSubmissionSchema = z.union([
	z.object({ success: z.literal(true), jobId: z.string().min(1) }),
	z.object({ success: z.literal(false) }),
]);

const orderStatusSchema = z.enum([
	'Draft',
	'Pending',
	'Completed',
	'Cancelled',
	'Scheduled',
	'Executing',
	'Failed',
]);

const asyncOrderJobReportSchema = z.object({
	success: z.boolean().optional().default(true),
	status: z.enum(['Processing', 'Failed', 'Completed']),
	errors: z.string().nullable().optional().default(null),
	result: z
		.object({
			status: orderStatusSchema,
			orderNumber: z.string().optional(),
			invoiceNumbers: z.array(z.string()).optional(),
		})
		.nullable()
		.optional()
		.default(null),
});

export type AsyncOrderResult = NonNullable<
	z.infer<typeof asyncOrderJobReportSchema>['result']
>;

type AsyncOrderClient = Pick<ZuoraClient, 'get' | 'post'>;

type Wait = (milliseconds: number) => Promise<void>;
type Now = () => number;

export type AsyncOrderOptions = {
	now?: Now;
	wait?: Wait;
	idempotencyKey?: string;
};

class LockingContention extends Error {}

const wait = (milliseconds: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));

const remainingDuration = (deadline: number, now: Now): number =>
	deadline - now();

const requestTimeout = (deadline: number, now: Now): number =>
	Math.min(remainingDuration(deadline, now), readTimeoutInMilliseconds);

const waitForNextPoll = async (
	deadline: number,
	now: Now,
	pause: Wait,
): Promise<boolean> => {
	const remaining = remainingDuration(deadline, now);
	if (remaining <= 0) {
		return false;
	}
	await pause(Math.min(remaining, pollIntervalInMilliseconds));
	return true;
};

const waitForCompletion = async (
	zuoraClient: AsyncOrderClient,
	jobId: string,
	deadline: number,
	now: Now,
	pause: Wait,
): Promise<AsyncOrderResult> => {
	while (remainingDuration(deadline, now) > 0) {
		let job: z.infer<typeof asyncOrderJobReportSchema>;
		try {
			job = await zuoraClient.get(
				`/v1/async-jobs/${jobId}`,
				asyncOrderJobReportSchema,
				undefined,
				requestTimeout(deadline, now),
			);
		} catch (error) {
			logger.log(
				`Could not read Zuora order job ${jobId}: ${String(error)}. Retrying.`,
			);
			if (await waitForNextPoll(deadline, now, pause)) {
				continue;
			}
			break;
		}
		if (!job.success) {
			throw new Error(
				`Zuora order job ${jobId} failed: ${job.errors ?? 'no reason returned'}`,
			);
		}

		switch (job.status) {
			case 'Processing':
				if (await waitForNextPoll(deadline, now, pause)) {
					continue;
				}
				break;
			case 'Failed':
				if (job.errors?.includes(lockingContentionCode)) {
					throw new LockingContention(
						`Zuora order job ${jobId} failed because the subscription is locked`,
					);
				}
				throw new Error(
					`Zuora order job ${jobId} failed: ${job.errors ?? 'no reason returned'}`,
				);
			case 'Completed':
				if (job.result?.status === 'Completed') {
					return job.result;
				}
				throw new Error(
					`Zuora order job ${jobId} completed with order status ${job.result?.status ?? 'missing'}`,
				);
		}
	}
	throw new Error(`Timed out waiting for Zuora order job ${jobId}`);
};

export const createOrderAsynchronously = async (
	zuoraClient: AsyncOrderClient,
	orderRequest: OrderRequest,
	maximumDurationInMilliseconds: number,
	{
		now = Date.now,
		wait: pause = wait,
		idempotencyKey,
	}: AsyncOrderOptions = {},
): Promise<AsyncOrderResult> => {
	if (maximumDurationInMilliseconds <= 0) {
		throw new Error('The Zuora order time budget must be positive');
	}

	const deadline = now() + maximumDurationInMilliseconds;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const remaining = remainingDuration(deadline, now);
		if (remaining <= 0) {
			throw new Error('Timed out before submitting the Zuora order');
		}

		const submission = await zuoraClient.post(
			'/v1/async/orders',
			JSON.stringify(orderRequest),
			asyncOrderSubmissionSchema,
			idempotencyKey === undefined
				? undefined
				: { 'idempotency-key': `${idempotencyKey}-${attempt}` },
			Math.min(remaining, readTimeoutInMilliseconds),
		);
		if (!submission.success) {
			throw new Error('Zuora did not accept the order');
		}

		logger.log(`Submitted Zuora order job ${submission.jobId}`);
		try {
			const result = await waitForCompletion(
				zuoraClient,
				submission.jobId,
				deadline,
				now,
				pause,
			);
			logger.log(`Zuora order job ${submission.jobId} completed`);
			return result;
		} catch (error) {
			if (
				error instanceof LockingContention &&
				attempt === 0 &&
				remainingDuration(deadline, now) >
					lockingContentionRetryDelayInMilliseconds
			) {
				logger.log(
					`Retrying the Zuora order after locking contention: ${error.message}`,
				);
				await pause(lockingContentionRetryDelayInMilliseconds);
				continue;
			}
			throw error;
		}
	}

	throw new Error('The Zuora order could not be completed');
};
