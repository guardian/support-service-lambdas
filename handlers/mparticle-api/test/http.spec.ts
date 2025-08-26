import * as fs from 'fs';
import * as path from 'path';
import { faker } from '@faker-js/faker';

import type { AppConfig } from '../src/services/config';
import { invokeHttpHandler } from './invoke-http-handler';
import {
	mockFetchJsonResponse,
	mockFetchResponse,
} from './mockFetch';

jest.mock('../src/services/config', () => ({
	getAppConfig: jest.fn().mockResolvedValue({
		inputPlatform: {
			key: faker.string.nanoid(),
			secret: faker.string.nanoid(),
		},
		workspace: {
			key: faker.string.nanoid(),
			secret: faker.string.nanoid(),
		},
		pod: 'EU1',
	} as AppConfig),
	getEnv: jest.fn(() => 'CODE'),
}));

describe('mparticle-api HTTP tests', () => {
	beforeEach(() => {
		jest.resetModules();
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('Handle Data Subject Request state callback', async () => {
		const requestId = '475974fa-6b42-4370-bb56-b5d845686bb5'; // Do not fake it to match the header signature
		mockFetchJsonResponse({
			processor_certificate:
				'https://static.mparticle.com/dsr/opendsr_cert.pem',
		});
		mockFetchResponse(
			fs.readFileSync(
				path.join(__dirname, 'processor-certificate.pem'),
				'utf8',
			),
		);

		const result = await invokeHttpHandler({
			httpMethod: 'POST',
			path: `/data-subject-requests/${requestId}/callback`,
			// Do not fake it to match the header signature
			body: JSON.stringify({
				controller_id: '1402',
				expected_completion_time: '2025-06-09T00:00:00Z',
				/**
				 * This url is meaningful url since the whole request has
				 * to match the header signature on 'x-opendsr-signature'
				 * for proper validation.
				 */
				status_callback_url:
					'https://webhook.site/6dfd0447-e1f9-4a98-a391-25481898763b',
				subject_request_id: requestId,
				request_status: 'completed',
				results_url: null,
				extensions: null,
			}),
			headers: {
				'x-opendsr-processor-domain': 'opendsr.mparticle.com',
				'x-opendsr-signature':
					'q/zaWUW4dJYXo7Bu9NR0AkkwbS/lnab2cQ/6hxuhNw/8xnljzjXB3jJhUM7UTr5+KZZ5/delbtAKVNPXLAGZ7DoeWMnWwYeyq3Pzw4l5wugg3YtFLS5o0MRlGye6Vj0UH2c/T8vQ87/KNl5hYrhYqrZvNb+f+gL9eSZ80lQwMu27fVSrnh7yztNLHLP593kV9oq1QBXQqf8yRVGy7fcFieNHtgYAuKFJeDkCwx7e4ismhKNkfM8Xlt6TEdR8dAwB6TVbz3W7bk4dTUKQrAVX84js4V5Sphj+vUBT/NATel6HYlkSsOk10HLjbaM2BwQtd51rD6ex9VbtpP0G8mHDVw==',
			},
		});

		expect(result).toBeDefined();
		expect(result.statusCode).toBeDefined();
		expect(result.statusCode).toEqual(202);

		const body = JSON.parse(result.body) as {
			message: string;
			timestamp: Date;
		};
		expect(body.message).toEqual('Callback accepted and processed');
		expect(body.timestamp).toBeDefined();
	});
});
