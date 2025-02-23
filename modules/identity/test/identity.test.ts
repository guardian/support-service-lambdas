/**
 * These tests are marked as integration tests because they require a valid non-expired access token to run.
 * To set this up follow the instructions in ./README.md
 *
 * @group integration
 */

import * as fs from 'node:fs';
import { IdentityApiGatewayAuthenticator } from '@modules/identity/apiGateway';
import {
	ExpiredTokenError,
	InvalidScopesError,
	OktaTokenHelper,
} from '../src/identity';
import { buildProxyEvent } from './fixtures';

type Config = {
	validAuthHeader: string;
	expiredAuthHeader: string;
};

let validAuthHeader: string;
let authHeaderWithoutBearerPrefix: string;
let expiredAuthHeader: string;

beforeAll(() => {
	const data = fs.readFileSync(
		'/etc/gu/support-service-lambdas-auth-token-test.json',
		'utf8',
	);
	const config: Config = JSON.parse(data) as Config;
	validAuthHeader = config.validAuthHeader;
	authHeaderWithoutBearerPrefix = validAuthHeader.replace('Bearer ', '');
	expiredAuthHeader = config.expiredAuthHeader;
});

const identityHelperWithNoRequiredScopes = new OktaTokenHelper('CODE', []);

test('we can decode an access token', async () => {
	const jwt =
		await identityHelperWithNoRequiredScopes.verifyAccessToken(validAuthHeader);
	console.log(jwt);
	expect(jwt).toBeDefined();
});

test('we can decode an access token without the Bearer prefix', async () => {
	const jwt = await identityHelperWithNoRequiredScopes.verifyAccessToken(
		authHeaderWithoutBearerPrefix,
	);
	console.log(jwt);
	expect(jwt).toBeDefined();
});

test('we can return an identity id', async () => {
	const userDetails =
		await identityHelperWithNoRequiredScopes.getIdentityId(validAuthHeader);
	expect(userDetails.identityId.length).toBeGreaterThan(0);
	expect(userDetails.email.length).toBeGreaterThan(0);
});

test('we can return an identity id with required scopes', async () => {
	const identityHelper = new OktaTokenHelper('CODE', ['profile']);
	const userDetails = await identityHelper.getIdentityId(validAuthHeader);
	expect(userDetails.identityId.length).toBeGreaterThan(0);
	expect(userDetails.email.length).toBeGreaterThan(0);
});

test('we throw an error if the token does not have the required scopes', async () => {
	const identityHelper = new OktaTokenHelper('CODE', ['non-existent.scope']);
	await expect(identityHelper.getIdentityId(validAuthHeader)).rejects.toThrow(
		InvalidScopesError,
	);
});

test('we throw an error if the token is expired', async () => {
	await expect(
		identityHelperWithNoRequiredScopes.getIdentityId(expiredAuthHeader),
	).rejects.toThrow(ExpiredTokenError);
});

const authenticator = new IdentityApiGatewayAuthenticator('CODE', []);

test('ApiGateway event with a valid token returns an authenticated result', async () => {
	const result = await authenticator.authenticate(
		buildProxyEvent(validAuthHeader),
	);
	expect(result.type).toBe('success');
	if (result.type !== 'success') {
		throw new Error('Expected response to be an AuthenticatedApiGatewayEvent');
	}
	expect(result.userDetails.identityId.length).toBeGreaterThan(0);
});

test('ApiGateway event with expired token returns a 401 response', async () => {
	const result = await authenticator.authenticate(
		buildProxyEvent(expiredAuthHeader),
	);
	expect(result.type).toBe('failure');
	if (result.type !== 'failure') {
		throw new Error('Expected response to be a failure');
	}
	expect(result.response.statusCode).toBe(401);
});

test('ApiGateway event with an invalid token returns a 401 response', async () => {
	const result = await authenticator.authenticate(
		buildProxyEvent('Bearer invalid-token'),
	);
	expect(result.type).toBe('failure');
	if (result.type !== 'failure') {
		throw new Error('Expected response to be a failure');
	}
	expect(result.response.statusCode).toBe(401);
});

test('ApiGateway event with an missing token returns a 401 response', async () => {
	const result = await authenticator.authenticate(buildProxyEvent(undefined));
	expect(result.type).toBe('failure');
	if (result.type !== 'failure') {
		throw new Error('Expected response to be a failure');
	}
	expect(result.response.statusCode).toBe(401);
});

test('ApiGateway event with a valid token with incorrect scopes returns a 403 response', async () => {
	const authenticatorWithNonExistantScope = new IdentityApiGatewayAuthenticator(
		'CODE',
		['non-existent.scope'],
	);
	const result = await authenticatorWithNonExistantScope.authenticate(
		buildProxyEvent(validAuthHeader),
	);
	expect(result.type).toBe('failure');
	if (result.type !== 'failure') {
		throw new Error('Expected response to be a failure');
	}
	expect(result.response.statusCode).toBe(403);
});
