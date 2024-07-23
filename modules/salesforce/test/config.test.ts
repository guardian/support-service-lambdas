import { sfApiVersion } from '../src/config';

describe('sfApiVersion', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should return the default version if SF_API_VERSION is not set', () => {
    delete process.env.SF_API_VERSION;
    expect(sfApiVersion()).toBe('v54.0');
  });

  it('should return the version set in SF_API_VERSION environment variable', () => {
    const mockVersion = 'v55.0';
    process.env.SF_API_VERSION = mockVersion;
    expect(sfApiVersion()).toBe(mockVersion);
  });
});
