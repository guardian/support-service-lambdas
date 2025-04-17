/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import console from 'console';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { createPayment } from '@modules/zuora/payment';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import { createContribution } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { doSwitch, preview } from '../src/contributionToSupporterPlus';
import { adjustNonCollectedInvoice } from '../src/payment';
import type { SwitchInformation } from '../src/switchInformation';
import { getSwitchInformationWithOwnerCheck } from '../src/switchInformation';

interface ContributionCreationDetails {
	zuoraClient: ZuoraClient;
	subscription: ZuoraSubscription;
	switchInformation: SwitchInformation;
}

const jestConsole = console;
beforeEach(() => {
	global.console = console;
});
afterEach(() => {
	global.console = jestConsole;
});

const stage = 'CODE';
const contributionIdentityId = '200175946';

const createTestContribution = async (
	price: number,
	switchPrice: number,
	preview: boolean,
): Promise<ContributionCreationDetails> => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new contribution');
	const subscriptionNumber = await createContribution(zuoraClient, price);

	const input = { price: switchPrice, preview };
	const productCatalog = await getProductCatalogFromApi(stage);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const switchInformation = await getSwitchInformationWithOwnerCheck(
		stage,
		input,
		subscription,
		account,
		productCatalog,
		contributionIdentityId,
		zuoraClient,
	);
	return { zuoraClient, switchInformation, subscription };
};

describe('product-switching behaviour', () => {
	it('can preview an annual recurring contribution switch with an additional contribution element', async () => {
		const contributionPrice = 20;
		const { zuoraClient, switchInformation, subscription } =
			await createTestContribution(contributionPrice, contributionPrice, true);

		const result = await preview(zuoraClient, switchInformation, subscription);

		expect(result.supporterPlusPurchaseAmount).toEqual(contributionPrice);
	});

	it('can preview an annual recurring contribution switch at catalog price', async () => {
		const contributionPrice = 120;
		const { zuoraClient, switchInformation, subscription } =
			await createTestContribution(contributionPrice, contributionPrice, true);

		const result = await preview(zuoraClient, switchInformation, subscription);

		const expectedResult = {
			supporterPlusPurchaseAmount: contributionPrice,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toMatchObject(expectedResult);
	});

	it('can preview an annual recurring contribution switch with 50% discount', async () => {
		const subscriptionNumber = 'A-S00913236';
		const identityId = '200275077';
		const input = { price: 120, preview: true, applyDiscountIfAvailable: true };
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const switchInformation = await getSwitchInformationWithOwnerCheck(
			stage,
			input,
			subscription,
			account,
			productCatalog,
			identityId,
			zuoraClient,
		);

		const result = await preview(zuoraClient, switchInformation, subscription);

		const expectedResult = {
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 58.39,
			contributionRefundAmount: -1.61,
			discount: {
				discountedPrice: 60,
				discountPercentage: 50,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);
	});

	it.only('can preview an annual recurring contribution (non UK - German) switch with 50% discount', async () => {
		const subscriptionNumber = 'A-S00946209';
		const identityId = '200196235';
		const input = { price: 120, preview: true, applyDiscountIfAvailable: true };
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const switchInformation = await getSwitchInformationWithOwnerCheck(
			stage,
			input,
			subscription,
			account,
			productCatalog,
			identityId,
			zuoraClient,
		);

		const result = await preview(zuoraClient, switchInformation, subscription);

		const expectedResult = {
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 22.33,
			contributionRefundAmount: -37.67,
			discount: {
				discountedPrice: 60,
				discountPercentage: 50,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);
	});

	it('preview of annual recurring contribution switch with 50% discount fails validation check', async () => {
		const subscriptionNumber = 'A-S00913236';
		const identityId = '200275077';
		const input = { price: 200, preview: true, applyDiscountIfAvailable: true };
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const switchInformation = await getSwitchInformationWithOwnerCheck(
			stage,
			input,
			subscription,
			account,
			productCatalog,
			identityId,
			zuoraClient,
		);

		const result = await preview(zuoraClient, switchInformation, subscription);

		const expectedResult = {
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 58.39,
			contributionRefundAmount: -1.61,
			discount: {
				discountedPrice: 60,
				discountPercentage: 50,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);
	});

	it(
		'can switch a recurring contribution',
		async () => {
			const contributionPrice = 10;
			const { zuoraClient, switchInformation } = await createTestContribution(
				contributionPrice,
				contributionPrice,
				true,
			);

			const response = await doSwitch(zuoraClient, switchInformation);
			expect(response.success).toEqual(true);
		},
		1000 * 60,
	);

	it(
		'can take a payment after a switch',
		async () => {
			const contributionPrice = 2;
			const { zuoraClient, switchInformation } = await createTestContribution(
				contributionPrice,
				5,
				false,
			);

			const response = await doSwitch(zuoraClient, switchInformation);

			await createPayment(
				zuoraClient,
				response.invoiceIds?.[0] ?? '',
				3,
				switchInformation.account.id,
				switchInformation.account.defaultPaymentMethodId,
				dayjs(),
			);
		},
		1000 * 60,
	);

	it(
		'can adjust an invoice to zero',
		async () => {
			const contributionPrice = 2;
			const { zuoraClient, switchInformation } = await createTestContribution(
				contributionPrice,
				2.1,
				false,
			);

			const switchResponse = await doSwitch(zuoraClient, switchInformation);

			const invoiceId = getIfDefined(
				switchResponse.invoiceIds?.[0],
				'invoice id was undefined in response from Zuora',
			);

			const response = await adjustNonCollectedInvoice(
				zuoraClient,
				invoiceId,
				0.1,
				'8ad08e1a858672180185880566606fad',
			);

			expect(response.Success).toBe(true);
		},
		1000 * 60,
	);
});
