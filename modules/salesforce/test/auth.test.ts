import type { SfApiUserAuth, SfAuthResponse, SfConnectedAppAuth } from '../src/auth';
import { doSfAuth } from '../src/auth';

global.fetch = jest.fn();

describe('doSfAuth', () => {
  const mockAuthResponse: SfAuthResponse = {
    access_token: 'mock_access_token',
    instance_url: 'https://mock.instance.url',
    id: 'mock_id',
    token_type: 'Bearer',
    issued_at: 'mock_issued_at',
    signature: 'mock_signature',
  };

  const sfApiUserAuth: SfApiUserAuth = {
    url: 'https://mock.auth.url',
    grant_type: 'password',
    username: 'mock_username',
    password: 'mock_password',
    token: 'mock_token',
  };

  const sfConnectedAppAuth: SfConnectedAppAuth = {
    clientId: 'mock_client_id',
    clientSecret: 'mock_client_secret',
  };

  it('should authenticate successfully', async () => {
    // Mock successful response
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => await Promise.resolve(mockAuthResponse),
    } as Response);

    const response = await doSfAuth(sfApiUserAuth, sfConnectedAppAuth);
    expect(response).toEqual(mockAuthResponse);
  });

  it('should handle fetch errors', async () => {
    // Mock failed response
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      text: async () => await Promise.resolve('Error response text'),
    } as Response);

    await expect(doSfAuth(sfApiUserAuth, sfConnectedAppAuth))
      .rejects
      .toThrow('Error response from Salesforce: Error response text');
  });

  it('should handle invalid response format', async () => {
    // Mock invalid response format
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => await Promise.resolve({
        access_token: 'mock_access_token',
        instance_url: 'not_a_url', // Invalid URL
      }),
    } as Response);

    await expect(doSfAuth(sfApiUserAuth, sfConnectedAppAuth))
      .rejects
      .toThrow('Error parsing response from Salesforce:');
  });
});
