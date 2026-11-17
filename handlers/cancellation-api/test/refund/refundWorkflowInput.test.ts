import { refundWorkflowInputSchema } from '../../src/refund/refundWorkflowInput';

const refundDueInput = {
	subscriptionNumber: 'A-S00123456',
	accountNumber: 'A00123456',
	cancellationOrderNumber: 'O-00123456',
	negativeInvoiceId: '8ad08872a1e91f6001a1ea1029f47a09',
};

const { negativeInvoiceId: _, ...noRefundInput } = refundDueInput;

describe('refundWorkflowInputSchema', () => {
	it('parses a refund-due input', () => {
		expect(refundWorkflowInputSchema.parse(refundDueInput)).toEqual(
			refundDueInput,
		);
	});

	it('parses an input with no refund due, without a negative invoice', () => {
		expect(refundWorkflowInputSchema.parse(noRefundInput)).toEqual(
			noRefundInput,
		);
	});

	it('ignores unknown fields, so newer cancellation Lambdas can add optional fields', () => {
		expect(
			refundWorkflowInputSchema.parse({ ...refundDueInput, newField: 'x' }),
		).toEqual(refundDueInput);
	});
});
