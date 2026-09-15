import { SfClient } from '@modules/salesforce/sfClient';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { clearSalesforceContactIds } from '../../src/services/clearSalesforceContactIds';
import { clearZuoraAccountIds } from '../../src/services/clearZuoraAccountIds';
import { defaultDependencies } from '../../src/services/defaultDependencies';
import { findSalesforceContactIds } from '../../src/services/findSalesforceContactIds';
import { findZuoraAccountIds } from '../../src/services/findZuoraAccountIds';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(),
}));
jest.mock('@modules/salesforce/sfClient', () => ({
	SfClient: { createWithClientCredentials: jest.fn() },
}));
jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn() },
}));
jest.mock('../../src/services/findSalesforceContactIds', () => ({
	findSalesforceContactIds: jest.fn(),
}));
jest.mock('../../src/services/clearSalesforceContactIds', () => ({
	clearSalesforceContactIds: jest.fn(),
}));
jest.mock('../../src/services/findZuoraAccountIds', () => ({
	findZuoraAccountIds: jest.fn(),
}));
jest.mock('../../src/services/clearZuoraAccountIds', () => ({
	clearZuoraAccountIds: jest.fn(),
}));

const mockStageFromEnvironment = jest.mocked(stageFromEnvironment);
// eslint-disable-next-line @typescript-eslint/unbound-method -- static factory method, `this` binding is not relevant
const mockCreateSfClient = jest.mocked(SfClient.createWithClientCredentials);
// eslint-disable-next-line @typescript-eslint/unbound-method -- static factory method, `this` binding is not relevant
const mockCreateZuoraClient = jest.mocked(ZuoraClient.create);
const mockFindSalesforceContactIds = jest.mocked(findSalesforceContactIds);
const mockClearSalesforceContactIds = jest.mocked(clearSalesforceContactIds);
const mockFindZuoraAccountIds = jest.mocked(findZuoraAccountIds);
const mockClearZuoraAccountIds = jest.mocked(clearZuoraAccountIds);

describe('defaultDependencies', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockStageFromEnvironment.mockReturnValue('CODE');
		mockCreateSfClient.mockResolvedValue({} as SfClient);
		mockCreateZuoraClient.mockResolvedValue({} as ZuoraClient);
	});

	it('creates least-privilege clients and wires the cleanup operations', async () => {
		const deps = await defaultDependencies();

		expect(mockCreateSfClient).toHaveBeenCalledWith(
			'CODE/Salesforce/ConnectedApp/IdentityDeletionCleanup',
		);
		expect(mockCreateZuoraClient).toHaveBeenCalledWith('CODE');

		await deps.findSalesforceContactIds('1234567');
		await deps.clearSalesforceContactIds(['contact-1']);
		await deps.findZuoraAccountIds('1234567');
		await deps.clearZuoraAccountIds(['account-1']);

		expect(mockFindSalesforceContactIds).toHaveBeenCalledWith(
			expect.anything(),
			'1234567',
		);
		expect(mockClearSalesforceContactIds).toHaveBeenCalledWith(
			expect.anything(),
			['contact-1'],
		);
		expect(mockFindZuoraAccountIds).toHaveBeenCalledWith(
			expect.anything(),
			'1234567',
		);
		expect(mockClearZuoraAccountIds).toHaveBeenCalledWith(expect.anything(), [
			'account-1',
		]);
	});
});
