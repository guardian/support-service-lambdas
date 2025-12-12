import * as crypto from 'crypto';
import { faker } from '@faker-js/faker';
import { X509CertificateGenerator } from '@peculiar/x509';
import type { AppConfig } from '../src/services/config';
import { invokeHttpHandler } from './invoke-http-handler';
import { mockFetchJsonResponse, mockFetchResponse } from './mockFetch';

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

/**
 * this generates a dynamic signature that will have a good enough expiry for testing purposes
 * @param requestBody
 */
async function generateTestBodySignature(requestBody: string) {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256',
		},
		true,
		['sign', 'verify'],
	);

	const cert = await X509CertificateGenerator.create({
		serialNumber: '01',
		subject: 'CN=opendsr.mparticle.com',
		issuer: 'CN=opendsr.mparticle.com',
		notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
		notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		publicKey: keyPair.publicKey,
		signingKey: keyPair.privateKey,
	});

	const certificatePem = cert.toString('pem');

	const privateKeyDer = await crypto.subtle.exportKey(
		'pkcs8',
		keyPair.privateKey,
	);
	const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(
		privateKeyDer,
	)
		.toString('base64')
		.match(/.{1,64}/g)
		?.join('\n')}\n-----END PRIVATE KEY-----`;

	const signer = crypto.createSign('SHA256');
	signer.update(requestBody, 'utf8');
	const signature = signer.sign(privateKeyPem, 'base64');
	return { certificatePem, signature };
}

describe('mparticle-api HTTP tests', () => {
	beforeEach(() => {
		jest.resetModules();
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('Handle Data Subject Request state callback', async () => {
		const requestId = '475974fa-6b42-4370-bb56-b5d845686bb5';
		mockFetchJsonResponse({
			processor_certificate:
				'https://static.mparticle.com/dsr/opendsr_cert.pem',
		});

		const requestBody = JSON.stringify({
			controller_id: '1402',
			expected_completion_time: '2025-06-09T00:00:00Z',
			status_callback_url:
				'https://webhook.site/6dfd0447-e1f9-4a98-a391-25481898763b',
			subject_request_id: requestId,
			request_status: 'completed',
			results_url: null,
			extensions: null,
		});

		const { certificatePem, signature } =
			await generateTestBodySignature(requestBody);

		mockFetchResponse(certificatePem);

		const result = await invokeHttpHandler({
			httpMethod: 'POST',
			path: `/data-subject-requests/${requestId}/callback`,
			body: requestBody,
			headers: {
				'x-opendsr-processor-domain': 'opendsr.mparticle.com',
				'x-opendsr-signature': signature,
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
