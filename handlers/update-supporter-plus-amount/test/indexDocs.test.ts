import { buildScalarDocsHtml } from '@modules/routing/honoOpenApiDocs';

describe('Hono docs routes', () => {
	beforeEach(() => {
		process.env.STAGE = 'CODE';
		jest.resetModules();
	});

	test('serves openapi json generated from registered route schemas', async () => {
		const { updateSupporterPlusAmountApp } = await import('../src/index');
		const response =
			await updateSupporterPlusAmountApp.request('/openapi.json');
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(response.status).toBe(200);
		expect(serialized).toContain(
			'/update-supporter-plus-amount/{subscriptionNumber}',
		);
		expect(serialized).toContain('newPaymentAmount');
		expect(serialized).toContain('x-api-key');
	});

	test('builds scalar html that points at openapi.json', () => {
		const body = buildScalarDocsHtml('/openapi.json', 'My API');

		expect(body).toContain('@scalar/api-reference');
		expect(body).toContain('data-url="/openapi.json"');
		expect(body).toContain('data-configuration');
	});
});
