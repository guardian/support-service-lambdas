/**
 * These tests are marked as integration tests because they require a valid non-expired access token to run.
 * To get one of these, you can do the following:
 *  - ensure you are logged in to a guardian account via profile.code.dev-theguardian.com
 *  - open the network tab in your browser's developer tools
 *  - go to support.code.dev-theguardian.com and look for a request to the members-data-api /user/me endpoint
 *  - copy the Authorization header from that request and paste it below
 *
 * @group integration
 */

import { IdentityAuthorisationHelper } from '../src/identity';

const authHeader =
	'Bearer eyJraWQiOiJLZG0wMzdjbGpNcFVZNkhpSW1fRExlYXBRc3JpeHJtQVY1b0FmR08xUlQ4IiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULkRJR21Qd251TzI5VEtqWF9JOEZaY1pDLWFQb3d0UTQxdW9XZ0FZemhtbnMiLCJpc3MiOiJodHRwczovL3Byb2ZpbGUuY29kZS5kZXYtdGhlZ3VhcmRpYW4uY29tL29hdXRoMi9hdXMzdjlnbGE5NVRvajBFRTB4NyIsImF1ZCI6Imh0dHBzOi8vcHJvZmlsZS5jb2RlLmRldi10aGVndWFyZGlhbi5jb20vIiwiaWF0IjoxNzMyODc4MTk5LCJleHAiOjE3MzI4ODE3OTksImNpZCI6IjBvYTUzeDZ2M2JadzRwZHNKMHg3IiwidWlkIjoiMDB1ODk1ZWF4cXl1VFdBRHUweDciLCJzY3AiOlsib3BlbmlkIiwiZW1haWwiLCJpZF90b2tlbi5wcm9maWxlLnN1cHBvcnQiLCJwcm9maWxlIiwiZ3VhcmRpYW4ubWVtYmVycy1kYXRhLWFwaS5yZWFkLnNlbGYiLCJndWFyZGlhbi5tZW1iZXJzLWRhdGEtYXBpLmNvbXBsZXRlLnJlYWQuc2VsZi5zZWN1cmUiXSwiYXV0aF90aW1lIjoxNzMyODc4MTYwLCJzdWIiOiJydXBlcnQuYmF0ZXMrdDMtZGlzY291bnRAb2JzZXJ2ZXIuY28udWsiLCJlbWFpbF92YWxpZGF0ZWQiOnRydWUsImxlZ2FjeV9pZGVudGl0eV9pZCI6IjIwMDI3NDgxMCIsImVtYWlsIjoicnVwZXJ0LmJhdGVzK3QzLWRpc2NvdW50QG9ic2VydmVyLmNvLnVrIn0.gK5f3DARTRlYR4X_kBDQXnmwfpZB2v3I7lTibqIxy8ujFTDRGEZgqaK3u_LGQTEuieK346ynWq59XfMheA7He5MSQchAQqUxjBJQ4iLZatut6Bh0Ea4JyKsGSUKoO8qzxGAhQMUT4dLthQs_9vaSxC5jNTTPH-zeOLpTxLkjljTPHbqBCNUdA_5CVEU2dOhX9geoCb97b-F-kVbFdKqoj6JWsCsE_9h0eFJEDGyfM1iVhRIXIRFI4hkQdr8lmimCRd0DOZgaxS32RK3KqBHYbrXYr0L8uNrwS7LXBTVfuCtgDjM8Wyf9k7NkIWswIn9Ywgxr675eSWNTsmvvGFkboA';

const identityHelperWithNoRequiredScopes = new IdentityAuthorisationHelper(
	'CODE',
);

test('we can decode an access token', async () => {
	const jwt =
		await identityHelperWithNoRequiredScopes.verifyAccessToken(authHeader);
	console.log(jwt);
	expect(jwt).toBeDefined();
});

test('we can return an identity id', async () => {
	const identityId =
		await identityHelperWithNoRequiredScopes.checkIdentityToken(authHeader);
	expect(identityId.length).toBeGreaterThan(0);
});

test('we can return an identity id with required scopes', async () => {
	const identityHelper = new IdentityAuthorisationHelper('CODE', [
		'guardian.members-data-api.read.self',
	]);
	const identityId = await identityHelper.checkIdentityToken(authHeader);
	expect(identityId.length).toBeGreaterThan(0);
});

test('we throw an error if the token does not have the required scopes', async () => {
	const identityHelper = new IdentityAuthorisationHelper('CODE', [
		'non-existent.scope',
	]);
	await expect(identityHelper.checkIdentityToken(authHeader)).rejects.toThrow(
		/claim 'scp' value.*does not include expected value 'non-existent.scope'/,
	);
});
