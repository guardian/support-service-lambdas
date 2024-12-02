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

import {
	ExpiredTokenError,
	IdentityAuthorisationHelper,
	InvalidScopesError,
} from '../src/identity';

const authHeader =
	'Bearer eyJraWQiOiJLZG0wMzdjbGpNcFVZNkhpSW1fRExlYXBRc3JpeHJtQVY1b0FmR08xUlQ4IiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULkVQRWdtNUd6RUpIYkNTdGx2bTlpTXpoMWs0ZDVzNWliNF8wZHZjelhwV2ciLCJpc3MiOiJodHRwczovL3Byb2ZpbGUuY29kZS5kZXYtdGhlZ3VhcmRpYW4uY29tL29hdXRoMi9hdXMzdjlnbGE5NVRvajBFRTB4NyIsImF1ZCI6Imh0dHBzOi8vcHJvZmlsZS5jb2RlLmRldi10aGVndWFyZGlhbi5jb20vIiwic3ViIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIiwiaWF0IjoxNzMzMTUyMTQxLCJleHAiOjE3MzMxNTU3NDEsImNpZCI6IjBvYTRpeWp4NjkyQWo4U2xaMHg3IiwidWlkIjoiMDB1ODFyenVjdG16QTRKeHcweDciLCJzY3AiOlsicHJvZmlsZSIsImVtYWlsIiwib3BlbmlkIl0sImF1dGhfdGltZSI6MTczMjg5NjQ1OCwiaWRlbnRpdHlfdXNlcm5hbWUiOiIiLCJlbWFpbF92YWxpZGF0ZWQiOnRydWUsImxlZ2FjeV9pZGVudGl0eV9pZCI6IjIwMDI2NDQwNCIsImVtYWlsIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIn0.aLDeV6UUqmH5wGnR0d02bHKdaSS0HeGX_zrAjTcbumpyNYCWcET_Tj6XTUkGcfpCD4ILv-F6vlKBJYVqGpMP8spX2IYFNh32B3DdkhsSsdYkU1aCVDY_k6ipErYeFo0q57iYsQxRqVTd7UHTK6MrQHpmwy9iGEvm9odm_9W7quGESRUhDEChMGbdgqjmKEGzmfDkK4whAywVj8xqMyGT9DilUWQ-7h118R68mLCo51cGIfbGp7fPm0jZlL7u3YpnR1LNM3yN0AAoocZptjjEpybLmDUFqfE5aLDgvA4Ts2vOIT3ileV_i0MbwcpN2iTQoq3OvhUxt8FMIIzm9iiTmg';

const identityHelperWithNoRequiredScopes = new IdentityAuthorisationHelper(
	'CODE',
	[],
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
	const identityHelper = new IdentityAuthorisationHelper('CODE', ['profile']);
	const identityId = await identityHelper.checkIdentityToken(authHeader);
	expect(identityId.length).toBeGreaterThan(0);
});

test('we throw an error if the token does not have the required scopes', async () => {
	const identityHelper = new IdentityAuthorisationHelper('CODE', [
		'non-existent.scope',
	]);
	await expect(identityHelper.checkIdentityToken(authHeader)).rejects.toThrow(
		InvalidScopesError,
	);
});

test('we throw an error if the token is expired', async () => {
	const expiredAuthHeader =
		'Bearer eyJraWQiOiJLZG0wMzdjbGpNcFVZNkhpSW1fRExlYXBRc3JpeHJtQVY1b0FmR08xUlQ4IiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULjVvZEk2b2pVQXhMYlh6NFJJVUZhbGJQVzhNTVZPWElLNktNUGNQUDRHdmMiLCJpc3MiOiJodHRwczovL3Byb2ZpbGUuY29kZS5kZXYtdGhlZ3VhcmRpYW4uY29tL29hdXRoMi9hdXMzdjlnbGE5NVRvajBFRTB4NyIsImF1ZCI6Imh0dHBzOi8vcHJvZmlsZS5jb2RlLmRldi10aGVndWFyZGlhbi5jb20vIiwic3ViIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIiwiaWF0IjoxNzMyODAxNzE5LCJleHAiOjE3MzI4MjMzMTksImNpZCI6IjBvYTUzeDZrNXdHWVhPR3ptMHg3IiwidWlkIjoiMDB1ODFyenVjdG16QTRKeHcweDciLCJzY3AiOlsiZ3VhcmRpYW4uaWRlbnRpdHktYXBpLm5ld3NsZXR0ZXJzLnVwZGF0ZS5zZWxmIiwiZ3VhcmRpYW4uaWRlbnRpdHktYXBpLnVzZXIudXNlcm5hbWUuY3JlYXRlLnNlbGYuc2VjdXJlIiwiZ3VhcmRpYW4uZGlzY3Vzc2lvbi1hcGkucHJpdmF0ZS1wcm9maWxlLnJlYWQuc2VsZiIsImlkX3Rva2VuLnByb2ZpbGUudGhlZ3VhcmRpYW4iLCJvcGVuaWQiLCJwcm9maWxlIiwiZ3VhcmRpYW4uZGlzY3Vzc2lvbi1hcGkudXBkYXRlLnNlY3VyZSIsImd1YXJkaWFuLmlkZW50aXR5LWFwaS5uZXdzbGV0dGVycy5yZWFkLnNlbGYiLCJndWFyZGlhbi5tZW1iZXJzLWRhdGEtYXBpLnJlYWQuc2VsZiIsImVtYWlsIl0sImF1dGhfdGltZSI6MTczMjcyNjY4OCwiaWRlbnRpdHlfdXNlcm5hbWUiOiIiLCJlbWFpbF92YWxpZGF0ZWQiOnRydWUsImxlZ2FjeV9pZGVudGl0eV9pZCI6IjIwMDI2NDQwNCIsImVtYWlsIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIn0.QkcH3_2psLJ1482K00ePQDbSEEhx2ObrJHSpsnpYOfRrBPd_OZpn6nBXm_nbxmx9YscIictqOmJw92Xz5kwPruA98BlHZ_C_dFui1DWkvZv6KbcDpUU4AM0oWi0pptTg8zqpMU-b0gAI_28hQG2S45Q8sVhyuUX_VruBsD-bpGkSmmgTis5uc2ZmrFekkeKwvnZxxsmmqgwJxkfeykIMWcEPCzPpKMZs4IikvlGyGBgW-E8ECMRt2WtStg32MRFF_kNmLqB5SqrXfZ7kcIm4-BYwNPZU-oXO7TMgnS0a4rLOxDKKU_ALQCupMF-JxoQ-pHbyoyMsY9-V-78sFZ61HA';
	await expect(
		identityHelperWithNoRequiredScopes.checkIdentityToken(expiredAuthHeader),
	).rejects.toThrow(ExpiredTokenError);
});
