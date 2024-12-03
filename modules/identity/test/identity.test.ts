/**
 * These tests are marked as integration tests because they require a valid non-expired access token to run.
 * To get one of these, you can follow the instruction in this readme: https://github.com/guardian/identity/tree/main/docs/generating_tokens_locally
 * Or alternatively:
 *  - ensure you are logged in to a guardian account via profile.code.dev-theguardian.com
 *  - open the network tab in your browser's developer tools
 *  - go to support.code.dev-theguardian.com and look for a request to the members-data-api /user/me endpoint
 *  - copy the Authorization header from that request and paste it below
 *
 * @group integration
 */

import { IdentityApiGatewayAuthenticator } from '@modules/identity/apiGateway';
import {
	ExpiredTokenError,
	InvalidScopesError,
	OktaTokenHelper,
} from '../src/identity';
import { buildProxyEvent } from './fixtures';

export const validAuthHeader =
	'Bearer eyJraWQiOiJLZG0wMzdjbGpNcFVZNkhpSW1fRExlYXBRc3JpeHJtQVY1b0FmR08xUlQ4IiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULnp3LU9vcnVrZXhvODVSZ2dWSTRlbFF1aUh1aXVBcUVWQkQzLVdoVVJQZ28iLCJpc3MiOiJodHRwczovL3Byb2ZpbGUuY29kZS5kZXYtdGhlZ3VhcmRpYW4uY29tL29hdXRoMi9hdXMzdjlnbGE5NVRvajBFRTB4NyIsImF1ZCI6Imh0dHBzOi8vcHJvZmlsZS5jb2RlLmRldi10aGVndWFyZGlhbi5jb20vIiwic3ViIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIiwiaWF0IjoxNzMzMjI0NTk3LCJleHAiOjE3MzMyMjgxOTcsImNpZCI6IjBvYTRpeWp4NjkyQWo4U2xaMHg3IiwidWlkIjoiMDB1ODFyenVjdG16QTRKeHcweDciLCJzY3AiOlsicHJvZmlsZSIsImVtYWlsIiwib3BlbmlkIl0sImF1dGhfdGltZSI6MTczMjg5NjQ1OCwiaWRlbnRpdHlfdXNlcm5hbWUiOiIiLCJlbWFpbF92YWxpZGF0ZWQiOnRydWUsImxlZ2FjeV9pZGVudGl0eV9pZCI6IjIwMDI2NDQwNCIsImVtYWlsIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIn0.NY5eiU8Cm5Nj00sZyKoIMPIXuJPmuDVIE7cusiYqA7hgtFOkKmH8lkdJG1KVWOdBxnHirEnFJ3_fQxPqyGFHDQe1SwOuSZiHUzIv6Dsv-U9cu7sLbw9qBJp4bFxsc-Q8JGoBG0dfXVsIk5rMFV_4iS27WqguW6-YEPguyF9S6hn4usxf4AszcgYKCTotf2FrBhHcGArGo7qAYzJsHCh2x7tc5r3C9IKi9mWyuEuXiri2AogpSDz6sx4cFIJZcSBcsXN5Q9hM3nzrNhg2_h7-K7APNPCFXTIH0-_Nrxa_VzU71lB2UH-lgX8kmA4MEfxfBoNlWMPG_igF35o6vvJzbg';

const authHeaderWithoutBearerPrefix = validAuthHeader.replace('Bearer ', '');

export const expiredAuthHeader =
	'Bearer eyJraWQiOiJLZG0wMzdjbGpNcFVZNkhpSW1fRExlYXBRc3JpeHJtQVY1b0FmR08xUlQ4IiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULjVvZEk2b2pVQXhMYlh6NFJJVUZhbGJQVzhNTVZPWElLNktNUGNQUDRHdmMiLCJpc3MiOiJodHRwczovL3Byb2ZpbGUuY29kZS5kZXYtdGhlZ3VhcmRpYW4uY29tL29hdXRoMi9hdXMzdjlnbGE5NVRvajBFRTB4NyIsImF1ZCI6Imh0dHBzOi8vcHJvZmlsZS5jb2RlLmRldi10aGVndWFyZGlhbi5jb20vIiwic3ViIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIiwiaWF0IjoxNzMyODAxNzE5LCJleHAiOjE3MzI4MjMzMTksImNpZCI6IjBvYTUzeDZrNXdHWVhPR3ptMHg3IiwidWlkIjoiMDB1ODFyenVjdG16QTRKeHcweDciLCJzY3AiOlsiZ3VhcmRpYW4uaWRlbnRpdHktYXBpLm5ld3NsZXR0ZXJzLnVwZGF0ZS5zZWxmIiwiZ3VhcmRpYW4uaWRlbnRpdHktYXBpLnVzZXIudXNlcm5hbWUuY3JlYXRlLnNlbGYuc2VjdXJlIiwiZ3VhcmRpYW4uZGlzY3Vzc2lvbi1hcGkucHJpdmF0ZS1wcm9maWxlLnJlYWQuc2VsZiIsImlkX3Rva2VuLnByb2ZpbGUudGhlZ3VhcmRpYW4iLCJvcGVuaWQiLCJwcm9maWxlIiwiZ3VhcmRpYW4uZGlzY3Vzc2lvbi1hcGkudXBkYXRlLnNlY3VyZSIsImd1YXJkaWFuLmlkZW50aXR5LWFwaS5uZXdzbGV0dGVycy5yZWFkLnNlbGYiLCJndWFyZGlhbi5tZW1iZXJzLWRhdGEtYXBpLnJlYWQuc2VsZiIsImVtYWlsIl0sImF1dGhfdGltZSI6MTczMjcyNjY4OCwiaWRlbnRpdHlfdXNlcm5hbWUiOiIiLCJlbWFpbF92YWxpZGF0ZWQiOnRydWUsImxlZ2FjeV9pZGVudGl0eV9pZCI6IjIwMDI2NDQwNCIsImVtYWlsIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIn0.QkcH3_2psLJ1482K00ePQDbSEEhx2ObrJHSpsnpYOfRrBPd_OZpn6nBXm_nbxmx9YscIictqOmJw92Xz5kwPruA98BlHZ_C_dFui1DWkvZv6KbcDpUU4AM0oWi0pptTg8zqpMU-b0gAI_28hQG2S45Q8sVhyuUX_VruBsD-bpGkSmmgTis5uc2ZmrFekkeKwvnZxxsmmqgwJxkfeykIMWcEPCzPpKMZs4IikvlGyGBgW-E8ECMRt2WtStg32MRFF_kNmLqB5SqrXfZ7kcIm4-BYwNPZU-oXO7TMgnS0a4rLOxDKKU_ALQCupMF-JxoQ-pHbyoyMsY9-V-78sFZ61HA';

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
	const identityId =
		await identityHelperWithNoRequiredScopes.getIdentityId(validAuthHeader);
	expect(identityId.length).toBeGreaterThan(0);
});

test('we can return an identity id with required scopes', async () => {
	const identityHelper = new OktaTokenHelper('CODE', ['profile']);
	const identityId = await identityHelper.getIdentityId(validAuthHeader);
	expect(identityId.length).toBeGreaterThan(0);
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
	const response = await authenticator.authenticate(
		buildProxyEvent(validAuthHeader),
	);
	console.log(response);
	expect(response.type).toBe('AuthenticatedApiGatewayEvent');
	if (response.type !== 'AuthenticatedApiGatewayEvent') {
		throw new Error('Expected response to be an AuthenticatedApiGatewayEvent');
	}
	expect(response.identityId.length).toBeGreaterThan(0);
});

test('ApiGateway event with expired token returns a 401 response', async () => {
	const response = await authenticator.authenticate(
		buildProxyEvent(expiredAuthHeader),
	);
	expect(response.type).toBe('FailedAuthenticationResponse');
	if (response.type !== 'FailedAuthenticationResponse') {
		throw new Error('Expected response to be a FailedAuthenticationResponse');
	}
	expect(response.statusCode).toBe(401);
});

test('ApiGateway event with an invalid token returns a 401 response', async () => {
	const response = await authenticator.authenticate(
		buildProxyEvent('Bearer invalid-token'),
	);
	expect(response.type).toBe('FailedAuthenticationResponse');
	if (response.type !== 'FailedAuthenticationResponse') {
		throw new Error('Expected response to be a FailedAuthenticationResponse');
	}
	expect(response.statusCode).toBe(401);
});

test('ApiGateway event with a valid token with incorrect scopes returns a 403 response', async () => {
	const authenticatorWithNonExistantScope = new IdentityApiGatewayAuthenticator(
		'CODE',
		['non-existent.scope'],
	);
	const response = await authenticatorWithNonExistantScope.authenticate(
		buildProxyEvent(validAuthHeader),
	);
	expect(response.type).toBe('FailedAuthenticationResponse');
	if (response.type !== 'FailedAuthenticationResponse') {
		throw new Error('Expected response to be a FailedAuthenticationResponse');
	}
	expect(response.statusCode).toBe(403);
});
