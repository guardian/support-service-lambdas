import { createOrderAsynchronously } from '@modules/zuora/orders/asyncOrderRequests';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const orderRequest: OrderRequest = {
	orderDate: '2026-08-25',
	existingAccountNumber: 'A01234567',
	subscriptions: [],
};

const completedJob = {
	success: true,
	status: 'Completed',
	errors: null,
	result: { status: 'Completed', orderNumber: 'O-01234567' },
} as const;

const processingJob = {
	success: true,
	status: 'Processing',
	errors: null,
	result: null,
} as const;

const createClock = () => {
	let milliseconds = 0;
	return {
		now: () => milliseconds,
		wait: (duration: number) => {
			milliseconds += duration;
			return Promise.resolve();
		},
	};
};

const createZuoraClient = ({
	post,
	get,
}: {
	post: jest.Mock;
	get: jest.Mock;
}): ZuoraClient => ({ post, get }) as unknown as ZuoraClient;

test('waits for both the job and order to complete', async () => {
	const clock = createClock();
	const post = jest.fn().mockResolvedValue({ success: true, jobId: 'job-1' });
	const get = jest
		.fn()
		.mockResolvedValueOnce(processingJob)
		.mockResolvedValueOnce(completedJob);

	const result = await createOrderAsynchronously(
		createZuoraClient({ post, get }),
		orderRequest,
		20_000,
		clock,
	);

	expect(result).toEqual(completedJob.result);
	expect(post).toHaveBeenCalledTimes(1);
	expect(get).toHaveBeenCalledTimes(2);
});

test('retries a temporary failure while reading the same job', async () => {
	const clock = createClock();
	const post = jest.fn().mockResolvedValue({ success: true, jobId: 'job-1' });
	const get = jest
		.fn()
		.mockRejectedValueOnce(new Error('temporary network failure'))
		.mockResolvedValueOnce(completedJob);

	await createOrderAsynchronously(
		createZuoraClient({ post, get }),
		orderRequest,
		20_000,
		clock,
	);

	expect(post).toHaveBeenCalledTimes(1);
	expect(get).toHaveBeenCalledTimes(2);
});

test('retries once after explicit locking contention', async () => {
	const clock = createClock();
	const post = jest
		.fn()
		.mockResolvedValueOnce({ success: true, jobId: 'job-1' })
		.mockResolvedValueOnce({ success: true, jobId: 'job-2' });
	const get = jest
		.fn()
		.mockResolvedValueOnce({
			success: true,
			status: 'Failed',
			errors: '[40000050] subscription is locked',
			result: null,
		})
		.mockResolvedValueOnce(completedJob);

	await createOrderAsynchronously(
		createZuoraClient({ post, get }),
		orderRequest,
		70_000,
		{ ...clock, idempotencyKey: 'stripe-dispute-cancellation-du_123' },
	);

	expect(post).toHaveBeenCalledTimes(2);
	expect(get).toHaveBeenCalledTimes(2);
	expect(post).toHaveBeenNthCalledWith(
		1,
		'/v1/async/orders',
		expect.any(String),
		expect.anything(),
		{ 'idempotency-key': 'stripe-dispute-cancellation-du_123-0' },
		expect.any(Number),
	);
	expect(post).toHaveBeenNthCalledWith(
		2,
		'/v1/async/orders',
		expect.any(String),
		expect.anything(),
		{ 'idempotency-key': 'stripe-dispute-cancellation-du_123-1' },
		expect.any(Number),
	);
});

test('does not re-submit an order when submission fails', async () => {
	const clock = createClock();
	const post = jest.fn().mockRejectedValue(new Error('request timed out'));
	const get = jest.fn();

	await expect(
		createOrderAsynchronously(
			createZuoraClient({ post, get }),
			orderRequest,
			20_000,
			clock,
		),
	).rejects.toThrow('request timed out');

	expect(post).toHaveBeenCalledTimes(1);
	expect(get).not.toHaveBeenCalled();
});

test('fails when Zuora reports an unsuccessful job', async () => {
	const clock = createClock();
	const post = jest.fn().mockResolvedValue({ success: true, jobId: 'job-1' });
	const get = jest.fn().mockResolvedValue({
		success: false,
		status: 'Failed',
		errors: 'invalid order',
		result: null,
	});

	await expect(
		createOrderAsynchronously(
			createZuoraClient({ post, get }),
			orderRequest,
			20_000,
			clock,
		),
	).rejects.toThrow('Zuora order job job-1 failed: invalid order');

	expect(post).toHaveBeenCalledTimes(1);
	expect(get).toHaveBeenCalledTimes(1);
});

test('rejects a completed job without a completed order', async () => {
	const clock = createClock();
	const post = jest.fn().mockResolvedValue({ success: true, jobId: 'job-1' });
	const get = jest.fn().mockResolvedValue({
		success: true,
		status: 'Completed',
		errors: null,
		result: null,
	});

	await expect(
		createOrderAsynchronously(
			createZuoraClient({ post, get }),
			orderRequest,
			20_000,
			clock,
		),
	).rejects.toThrow('completed with order status missing');
});
