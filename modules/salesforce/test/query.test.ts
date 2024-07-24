import { z } from 'zod';
import type { SfAuthResponse } from '../src/auth';
import { executeSalesforceQuery } from '../src/query';

//errors here are similar to the ones with empty objects
global.fetch = jest.fn();

describe('executeSalesforceQuery', () => {

const mockAuthResponse: SfAuthResponse = {
    access_token: 'mock_access_token',
    instance_url: 'https://login.salesforce.com/services/oauth2/token',
    id: 'https://my.salesforce.com/id/mock_id',
    token_type: 'Bearer',
    issued_at: 'mock_issued_at',
    signature: 'mock_signature',
};

  const mockQuery = 'SELECT Id, Name FROM Account';
  const mockSchema = z.object({
    Id: z.string(),
    Name: z.string(),
  });

  const mockSuccessfulResponse = {
    totalSize: 1,
    done: true,
    records: [{ Id: '001', Name: 'Mock Account' }],
  };

  const mockInvalidResponse = {
    totalSize: 1,
    done: true,
    records: [{ Id: '001', Name: 123 }], // Invalid Name type
  };

  beforeEach(() => {
    jest.resetModules();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  it('should execute query successfully and return parsed response', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => await Promise.resolve(mockSuccessfulResponse),
    } as Response);

    const response = await executeSalesforceQuery(
      mockAuthResponse,
      mockQuery,
      mockSchema
    );

    expect(response).toEqual(mockSuccessfulResponse);
  });

  it('should throw an error if the query execution fails', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    } as Response);

    await expect(executeSalesforceQuery(mockAuthResponse, mockQuery, mockSchema))
      .rejects
      .toThrow('Failed to execute query: Bad Request');
  });

  it('should throw an error if the response parsing fails', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => await Promise.resolve(mockInvalidResponse),
    } as Response);

    await expect(executeSalesforceQuery(mockAuthResponse, mockQuery, mockSchema))
      .rejects
      .toThrow('Error parsing response from Salesforce:');
  });
});
