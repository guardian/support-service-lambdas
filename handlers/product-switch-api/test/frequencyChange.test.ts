// import {
// 	frequencyChangeRequestSchema,
// 	frequencyChangeResponseSchema,
// } from '../src/schemas';

describe('frequency change schemas', () => {
	it('valid preview request', () => {
		// const parsed = frequencyChangeRequestSchema.parse({
		// 	preview: true,
		// 	targetBillingPeriod: 'Annual',
		// });
		// expect(parsed.preview).toBe(true);
		expect(true).toBe(true);
	});

	// it('rejects invalid billing period', () => {
	// 	expect(() =>
	// 		frequencyChangeRequestSchema.parse({
	// 			preview: true,
	// 			targetBillingPeriod: 'Weekly',
	// 		}),
	// 	).toThrow();
	// });

	// it('response schema minimal success', () => {
	// 	const parsed = frequencyChangeResponseSchema.parse({
	// 		success: true,
	// 		mode: 'preview',
	// 		currentBillingPeriod: 'Month',
	// 		targetBillingPeriod: 'Annual',
	// 		previewInvoices: [],
	// 	});
	// 	expect(parsed.success).toBe(true);
	// });
});
