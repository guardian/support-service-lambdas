/**
 * @group unit
 */
import { handler } from '../../src/handlers/checkRunMadeProgress';
import { countRunOutcome } from '../../src/services';

jest.mock('../../src/services');

const mockCountRunOutcome = jest.mocked(countRunOutcome);

const manifest = {
	DestinationBucket: 'a-bucket',
	ResultFiles: { SUCCEEDED: [{ Key: 'executions/x/SUCCEEDED_0.json' }] },
};

const outcome = (over: Partial<Record<string, number>> = {}) => ({
	items: 500,
	scrubbed: 0,
	wouldScrub: 0,
	skipped: 500,
	...over,
});

beforeEach(() => {
	jest.resetAllMocks();
	process.env.STAGE = 'CODE';
	delete process.env.DRY_RUN;
});

it('fails a run that had work to do and scrubbed none of it', async () => {
	mockCountRunOutcome.mockResolvedValue(outcome());

	await expect(handler(manifest)).rejects.toThrow('scrubbed none of them');
});

it('is happy as soon as one payment method was scrubbed', async () => {
	mockCountRunOutcome.mockResolvedValue(outcome({ scrubbed: 1, skipped: 499 }));

	await expect(handler(manifest)).resolves.toEqual(
		expect.objectContaining({ scrubbed: 1 }),
	);
});

it('says nothing about an empty work list, which is the steady state', async () => {
	mockCountRunOutcome.mockResolvedValue(
		outcome({ items: 0, scrubbed: 0, skipped: 0 }),
	);

	await expect(handler(manifest)).resolves.toEqual(
		expect.objectContaining({ items: 0 }),
	);
});

it('stays quiet in dry run, where nothing is ever scrubbed', async () => {
	process.env.DRY_RUN = 'true';
	mockCountRunOutcome.mockResolvedValue(
		outcome({ wouldScrub: 500, skipped: 0 }),
	);

	await expect(handler(manifest)).resolves.toEqual(
		expect.objectContaining({ wouldScrub: 500 }),
	);
});

it('does not mistake a dry run tally for progress once dry run is off', async () => {
	process.env.DRY_RUN = 'false';
	mockCountRunOutcome.mockResolvedValue(
		outcome({ wouldScrub: 500, skipped: 0 }),
	);

	await expect(handler(manifest)).rejects.toThrow('scrubbed none of them');
});

it('refuses a manifest that is not shaped like one', async () => {
	await expect(handler({ nope: true })).rejects.toThrow();
	expect(mockCountRunOutcome).not.toHaveBeenCalled();
});
