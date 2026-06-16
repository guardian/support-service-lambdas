import { buildScalarDocsHtml } from '@modules/routing/honoOpenApiDocs';
import { app } from '../src/index';

// jest.mock() is hoisted before static imports — stageFromEnvironment() won't
// throw when index.ts is loaded, even though process.env.STAGE isn't set yet.
jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE' as const,
}));

describe('Hono docs routes', () => {
	test('serves openapi json generated from registered route schemas', async () => {
		const response = await app.request('/openapi.json');
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
