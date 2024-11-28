import { IdentityAuthorisationHelper } from '../src/identity';

const authHeader =
	'Bearer eyJraWQiOiJLZG0wMzdjbGpNcFVZNkhpSW1fRExlYXBRc3JpeHJtQVY1b0FmR08xUlQ4IiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULjVvZEk2b2pVQXhMYlh6NFJJVUZhbGJQVzhNTVZPWElLNktNUGNQUDRHdmMiLCJpc3MiOiJodHRwczovL3Byb2ZpbGUuY29kZS5kZXYtdGhlZ3VhcmRpYW4uY29tL29hdXRoMi9hdXMzdjlnbGE5NVRvajBFRTB4NyIsImF1ZCI6Imh0dHBzOi8vcHJvZmlsZS5jb2RlLmRldi10aGVndWFyZGlhbi5jb20vIiwic3ViIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIiwiaWF0IjoxNzMyODAxNzE5LCJleHAiOjE3MzI4MjMzMTksImNpZCI6IjBvYTUzeDZrNXdHWVhPR3ptMHg3IiwidWlkIjoiMDB1ODFyenVjdG16QTRKeHcweDciLCJzY3AiOlsiZ3VhcmRpYW4uaWRlbnRpdHktYXBpLm5ld3NsZXR0ZXJzLnVwZGF0ZS5zZWxmIiwiZ3VhcmRpYW4uaWRlbnRpdHktYXBpLnVzZXIudXNlcm5hbWUuY3JlYXRlLnNlbGYuc2VjdXJlIiwiZ3VhcmRpYW4uZGlzY3Vzc2lvbi1hcGkucHJpdmF0ZS1wcm9maWxlLnJlYWQuc2VsZiIsImlkX3Rva2VuLnByb2ZpbGUudGhlZ3VhcmRpYW4iLCJvcGVuaWQiLCJwcm9maWxlIiwiZ3VhcmRpYW4uZGlzY3Vzc2lvbi1hcGkudXBkYXRlLnNlY3VyZSIsImd1YXJkaWFuLmlkZW50aXR5LWFwaS5uZXdzbGV0dGVycy5yZWFkLnNlbGYiLCJndWFyZGlhbi5tZW1iZXJzLWRhdGEtYXBpLnJlYWQuc2VsZiIsImVtYWlsIl0sImF1dGhfdGltZSI6MTczMjcyNjY4OCwiaWRlbnRpdHlfdXNlcm5hbWUiOiIiLCJlbWFpbF92YWxpZGF0ZWQiOnRydWUsImxlZ2FjeV9pZGVudGl0eV9pZCI6IjIwMDI2NDQwNCIsImVtYWlsIjoicnVwZXJ0LmJhdGVzK3QzQG9ic2VydmVyLmNvLnVrIn0.QkcH3_2psLJ1482K00ePQDbSEEhx2ObrJHSpsnpYOfRrBPd_OZpn6nBXm_nbxmx9YscIictqOmJw92Xz5kwPruA98BlHZ_C_dFui1DWkvZv6KbcDpUU4AM0oWi0pptTg8zqpMU-b0gAI_28hQG2S45Q8sVhyuUX_VruBsD-bpGkSmmgTis5uc2ZmrFekkeKwvnZxxsmmqgwJxkfeykIMWcEPCzPpKMZs4IikvlGyGBgW-E8ECMRt2WtStg32MRFF_kNmLqB5SqrXfZ7kcIm4-BYwNPZU-oXO7TMgnS0a4rLOxDKKU_ALQCupMF-JxoQ-pHbyoyMsY9-V-78sFZ61HA';
const identityHelper = new IdentityAuthorisationHelper('CODE');
test('we can decode an access token', async () => {
	const jwt = await identityHelper.verifyAccessToken(authHeader);
	expect(jwt).toBeDefined();
});

test('we can return an identity id', async () => {
	const identityId = await identityHelper.checkIdentityToken(authHeader);
	expect(identityId).toBe('200264404');
});

test('we can return an identity id with required scopes', async () => {
	const identityId = await identityHelper.checkIdentityToken(authHeader, [
		'guardian.members-data-api.read.self',
	]);
	expect(identityId).toBe('200264404');
});

test('we throw an error if the token does not have the required scopes', async () => {
	await expect(
		identityHelper.checkIdentityToken(authHeader, ['invalid.scope']),
	).rejects.toThrow('access-token-invalid-scopes');
});
