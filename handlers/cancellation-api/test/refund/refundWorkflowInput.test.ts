import { refundWorkflowInputSchema } from '../../src/refund/refundWorkflowInput';

const validInput = {
	subscriptionNumber: 'A-S00123456',
	accountId: '8ad0823f8b1c2d3e018b1c2d3e4f0001',
	cancellationOrderNumber: 'O-00123456',
	cancellationBillingDate: '2026-11-16',
	refundDue: true,
};

describe('refundWorkflowInputSchema', () => {
	it('parses a valid input', () => {
		expect(refundWorkflowInputSchema.parse(validInput)).toEqual(validInput);
	});

	it('rejects a cancellationBillingDate that is not an ISO date', () => {
		expect(() =>
			refundWorkflowInputSchema.parse({
				...validInput,
				cancellationBillingDate: '2026-11-16T10:00:00Z',
			}),
		).toThrow();
	});

	it('ignores unknown fields, so newer cancellation Lambdas can add optional fields', () => {
		expect(
			refundWorkflowInputSchema.parse({ ...validInput, newField: 'x' }),
		).toEqual(validInput);
	});
});
