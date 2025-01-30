import type { IdentityUserDetails } from '@modules/identity/identity';
import { getUserBenefits } from '@modules/product-benefits/userBenefits';
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { getUserBenefitsResponse } from '../src/benefitsMe';

jest.mock('@modules/product-benefits/userBenefits', () => ({
	getUserBenefits: jest.fn(),
}));
jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE',
}));

test('The api returns trial information for users without Feast benefits', async () => {
	(getUserBenefits as jest.Mock).mockImplementationOnce(() =>
		Promise.resolve([]),
	);
	const productCatalogHelper = {} as ProductCatalogHelper;
	const userDetails = {} as IdentityUserDetails;
	const response = await getUserBenefitsResponse(
		'CODE',
		productCatalogHelper,
		userDetails,
	);

	const expectedResponse = {
		benefits: [],
		trials: {
			feastApp: {
				androidOfferTag: 'initial_supporter_launch_offer',
				iosSubscriptionGroup: '21396030',
			},
		},
	};

	expect(response).toEqual(expectedResponse);
});

test('The api returns correct benefit and trial response for users with Feast benefit', async () => {
	(getUserBenefits as jest.Mock).mockImplementationOnce(() =>
		Promise.resolve(['feastApp']),
	);
	const productCatalogHelper = {} as ProductCatalogHelper;
	const userDetails = {} as IdentityUserDetails;
	const response = await getUserBenefitsResponse(
		'CODE',
		productCatalogHelper,
		userDetails,
	);

	const expectedResponse = {
		benefits: ['feastApp'],
		trials: {},
	};

	expect(response).toEqual(expectedResponse);
});
