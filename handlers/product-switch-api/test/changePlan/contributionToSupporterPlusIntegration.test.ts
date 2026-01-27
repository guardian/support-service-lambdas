/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import console from 'console';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { ContributionTestAdditionalOptions } from '../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { createContribution } from '../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { ProductSwitchEndpoint } from '../../src/changePlan/productSwitchEndpoint';
import type { ProductSwitchGenericRequestBody } from '../../src/changePlan/schemas';
import { ValidTargetProduct } from '../../src/changePlan/prepare/switchesHelper';
import { ValidationError } from '@modules/errors';

interface ContributionCreationDetails {
	zuoraClient: ZuoraClient;
	account: ZuoraAccount;
	subscription: ZuoraSubscription;
}

const jestConsole = console;
beforeEach(() => {
	global.console = console;
});
afterEach(() => {
	global.console = jestConsole;
});

const stage = 'CODE';

const createTestContribution = async (
	price: number,
	additionOptions?: Exclude<ContributionTestAdditionalOptions, 'price'>,
): Promise<ContributionCreationDetails> => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new contribution');

	const subscriptionNumber = await createContribution(zuoraClient, {
		price,
		...additionOptions,
	});
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	return { zuoraClient, account, subscription };
};

async function testPreview(
	testData: ContributionCreationDetails,
	input: ProductSwitchGenericRequestBody,
) {
	return await new ProductSwitchEndpoint(
		'CODE',
		dayjs(),
		input,
		testData.zuoraClient,
		testData.subscription,
		testData.account,
	).doPreview();
}

async function testSwitch(
	testData: ContributionCreationDetails,
	input: ProductSwitchGenericRequestBody,
) {
	return await new ProductSwitchEndpoint(
		'CODE',
		dayjs(),
		input,
		testData.zuoraClient,
		testData.subscription,
		testData.account,
	).doSwitch();
}

describe('product-switching behaviour', () => {
	it('can preview an annual recurring contribution switch with an additional contribution element', async () => {
		const contributionPrice = 20;
		const testData = await createTestContribution(contributionPrice, {
			billingPeriod: 'Month',
		});
		const input: ProductSwitchGenericRequestBody = {
			newAmount: contributionPrice,
			preview: true,
			applyDiscountIfAvailable: false,
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		expect(result.supporterPlusPurchaseAmount).toEqual(contributionPrice);
	});

	it('can preview an annual recurring contribution switch at catalog price', async () => {
		const contributionPrice = 120;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchGenericRequestBody = {
			newAmount: contributionPrice,
			preview: true,
			applyDiscountIfAvailable: false,
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		const expectedResult = {
			supporterPlusPurchaseAmount: contributionPrice,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toMatchObject(expectedResult);
	});

	it('can preview an annual recurring contribution switch with 50% discount', async () => {
		const contributionPrice = 60;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchGenericRequestBody = {
			preview: true,
			applyDiscountIfAvailable: true,
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		const expectedResult = {
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 0,
			contributionRefundAmount: -60,
			discount: {
				discountedPrice: 60,
				discountPercentage: 50,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);
	});

	it('can preview an annual recurring contribution (non UK - German) switch with 50% discount', async () => {
		const contributionPrice = 40;
		const testData = await createTestContribution(contributionPrice, {
			billingCountry: 'Germany',
			paymentMethod: 'visaCard',
		});
		const input: ProductSwitchGenericRequestBody = {
			preview: true,
			applyDiscountIfAvailable: true,
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		const expectedResult = {
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 20,
			contributionRefundAmount: -40,
			discount: {
				discountPercentage: 50,
				discountedPrice: 60,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);
	});

	it('preview of annual recurring contribution switch with 50% discount fails validation check if from a high amount', async () => {
		const contributionPrice = 200;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchGenericRequestBody = {
			preview: true,
			applyDiscountIfAvailable: true,
			targetProduct: 'SupporterPlus',
		};

		await expect(testPreview(testData, input)).rejects.toThrow(ValidationError);
	});

	it(
		'can switch a recurring contribution to S+ and then to D+',
		async () => {
			const contributionPrice = 120;
			const testData = await createTestContribution(contributionPrice);

			async function testSwitchLocal(
				targetProduct: ValidTargetProduct,
				testData: ContributionCreationDetails,
			) {
				const input: ProductSwitchGenericRequestBody = {
					preview: false,
					applyDiscountIfAvailable: false,
					targetProduct,
				};

				const response = await testSwitch(testData, input);

				expect(response.message).toContain(
					'Product move completed successfully',
				);
			}

			await testSwitchLocal('SupporterPlus', testData);
			const subscriptionAfter = await getSubscription(
				testData.zuoraClient,
				testData.subscription.subscriptionNumber,
			);
			await testSwitchLocal('DigitalSubscription', {
				...testData,
				subscription: subscriptionAfter,
			});
		},
		1000 * 60,
	);

	// it(
	// 	'can take a payment after a switch',
	// 	async () => {
	// 		const contributionPrice = 2;
	// 		const testData = await createTestContribution(
	// 			contributionPrice,
	// 			12,
	// 			false,
	// 			false,
	// 			{ billingPeriod: 'Month' },
	// 		);
	//
	// 		const response = await testSwitch(testData);
	//
	// 		await createPayment(
	// 			testData.zuoraClient,
	// 			response.invoiceIds?.[0] ?? '',
	// 			10,
	// 			testData.account.basicInfo.id,
	// 			testData.account.billingAndPayment.defaultPaymentMethodId,
	// 			dayjs(),
	// 		);
	// 	},
	// 	1000 * 60,
	// );
	//
	// it(
	// 	'can adjust an invoice to zero',
	// 	async () => {
	// 		const contributionPrice = 11.9;
	// 		const testData = await createTestContribution(
	// 			contributionPrice,
	// 			12,
	// 			false,
	// 			false,
	// 			{ billingPeriod: 'Month' },
	// 		);
	//
	// 		const switchResponse = await testSwitch(testData);
	//
	// 		const invoiceId = getIfDefined(
	// 			switchResponse.invoiceIds?.[0],
	// 			'invoice id was undefined in response from Zuora',
	// 		);
	//
	// 		const response = await adjustNonCollectedInvoice(
	// 			zuoraClient,
	// 			invoiceId,
	// 			0.1,
	// 			'8ad08cbd8586721c01858804e3715378',
	// 		);
	//
	// 		expect(response.Id).toBeDefined();
	// 	},
	// 	1000 * 60,
	// );
});
