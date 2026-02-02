/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import console from 'console';
import { invokeFunction } from '@modules/aws/lambda';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/routing/logger';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import { voidSchema } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import z from 'zod';
import type { ContributionTestAdditionalOptions } from '../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { createContribution } from '../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import type { PreviewResponse } from '../../src/changePlan/action/preview';
import type { SwitchResponse } from '../../src/changePlan/action/switch';
import { ChangePlanEndpoint } from '../../src/changePlan/changePlanEndpoint';
import type { LegacyProductSwitchRequestBody } from '../../src/changePlan/legacyContributionToSupporterPlusEndpoint';
import { legacyContributionToSupporterPlus } from '../../src/changePlan/legacyContributionToSupporterPlusEndpoint';
import type { ValidTargetProduct } from '../../src/changePlan/prepare/switchCatalogHelper';
import type { ProductSwitchRequestBody } from '../../src/changePlan/schemas';

// change to true to test the version on CODE instead of local
const testCODELambda: boolean = false;

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
	startDate: dayjs.Dayjs = dayjs(),
): Promise<ContributionCreationDetails> => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new contribution');

	const subscriptionNumber = await createContribution(
		zuoraClient,
		{
			price,
			...additionOptions,
		},
		startDate,
	);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	return { zuoraClient, account, subscription };
};

async function callCODELambda(requestBody: string, path: string) {
	const { result } = await invokeFunction(
		'product-switch-api-CODE',
		JSON.stringify({
			body: requestBody,
			headers: {},
			multiValueHeaders: {},
			httpMethod: 'POST',
			isBase64Encoded: false,
			path: path,
			pathParameters: null,
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			stageVariables: null,
			requestContext: emptyRequestContext,
			resource: '',
		} satisfies APIGatewayProxyEvent),
	);
	const { statusCode, body } = JSON.parse(result) as APIGatewayProxyResult;
	return { statusCode, body };
}

async function testLegacyCall(
	testData: ContributionCreationDetails,
	input: LegacyProductSwitchRequestBody,
) {
	if (testCODELambda) {
		const path = `/product-move/recurring-contribution-to-supporter-plus/${testData.subscription.subscriptionNumber}`;
		const { statusCode, body } = await callCODELambda(
			JSON.stringify(input),
			path,
		);
		expect(statusCode).toEqual(200);
		const response = JSON.parse(body) as PreviewResponse;
		return response;
	} else {
		return await legacyContributionToSupporterPlus(
			'CODE',
			dayjs(),
			input,
			testData.zuoraClient,
			testData.subscription,
			testData.account,
		);
	}
}

async function testPreview(
	testData: ContributionCreationDetails,
	input: ProductSwitchRequestBody,
) {
	return (await testCall(true, testData, input)) as PreviewResponse;
}

async function testSwitch(
	testData: ContributionCreationDetails,
	input: ProductSwitchRequestBody,
) {
	return (await testCall(false, testData, input)) as SwitchResponse;
}

async function testCall(
	preview: boolean,
	testData: ContributionCreationDetails,
	input: ProductSwitchRequestBody,
) {
	if (testCODELambda) {
		const path = `/subscriptions/${testData.subscription.subscriptionNumber}/change-plan${preview ? '/preview' : ''}`;
		const { statusCode, body } = await callCODELambda(
			JSON.stringify(input),
			path,
		);
		if (statusCode === 400) {
			throw new ValidationError(body);
		}
		expect(statusCode).toEqual(200);
		const response = JSON.parse(body) as PreviewResponse;
		return response;
	} else {
		const changePlanEndpoint = new ChangePlanEndpoint(
			'CODE',
			dayjs(),
			input,
			testData.zuoraClient,
			testData.subscription,
			testData.account,
		);
		return preview
			? await changePlanEndpoint.doPreview()
			: await changePlanEndpoint.doSwitch();
	}
}

async function addAmountChange(
	testData: ContributionCreationDetails,
	dateToUse: string,
) {
	await testData.zuoraClient.put(
		`v1/subscriptions/${testData.subscription.subscriptionNumber}`,
		JSON.stringify({
			notes: 'pretend update amount',
			update: [
				{
					chargeUpdateDetails: [
						{
							price: 100,
							ratePlanChargeId:
								testData.subscription.ratePlans[0]?.ratePlanCharges[0]?.id,
						},
					],
					contractEffectiveDate: dateToUse,
					customerAcceptanceDate: dateToUse,
					serviceActivationDate: dateToUse,
					ratePlanId: testData.subscription.ratePlans[0]?.id,
				},
			],
		}),
		z.object({}),
	);
}

describe('product-switching behaviour', () => {
	it("paused (discounted) contributions can't be switched", async () => {
		const zuoraClient = await ZuoraClient.create(stage);
		const subscriptionNumber = await createContribution(zuoraClient, {
			price: 20,
			billingPeriod: 'Month',
		});

		const path = `/v1/subscriptions/${subscriptionNumber}`;
		const twoMonthPauseProductRatePlanId = '8ad081dd8fd3d9df018fe2b6a7bc379d';
		const body = JSON.stringify({
			add: [
				{
					contractEffectiveDate: zuoraDateFormat(dayjs()),
					productRatePlanId: twoMonthPauseProductRatePlanId,
				},
			],
		});
		await zuoraClient.put(path, body, voidSchema);

		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const testData: ContributionCreationDetails = {
			account: await getAccount(zuoraClient, subscription.accountNumber),
			subscription,
			zuoraClient,
		};
		const input: ProductSwitchRequestBody = {
			mode: 'switchToBasePrice',
			targetProduct: 'SupporterPlus',
		};

		await expect(testPreview(testData, input)).rejects.toThrow(ValidationError);
	});

	it('can preview an annual recurring contribution switch with an additional contribution element', async () => {
		const contributionPrice = 20;
		const testData = await createTestContribution(contributionPrice, {
			billingPeriod: 'Month',
		});
		const input: ProductSwitchRequestBody = {
			mode: 'switchWithPriceOverride',
			newAmount: contributionPrice,
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		expect(result.targetCatalogPrice).toEqual(contributionPrice);
	});

	it('can preview an annual recurring contribution switch at catalog price', async () => {
		const contributionPrice = 120;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchRequestBody = {
			mode: 'switchWithPriceOverride',
			newAmount: contributionPrice,
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);
		logger.log('result', result);

		const expectedResult = {
			amountPayableToday: 0,
			proratedRefundAmount: contributionPrice,
			targetCatalogPrice: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toMatchObject(expectedResult);
	});

	it('can preview an annual recurring contribution switch at catalog price (legacy endpoint)', async () => {
		const contributionPrice = 120;
		const testData = await createTestContribution(contributionPrice);
		const input: LegacyProductSwitchRequestBody = {
			preview: true,
			newAmount: contributionPrice,
		};

		const result = await testLegacyCall(testData, input);
		logger.log('result', result);

		const expectedResult = {
			amountPayableToday: 0,
			contributionRefundAmount: contributionPrice * -1,
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toMatchObject(expectedResult);
	});

	it('can preview an annual recurring contribution switch with 50% discount', async () => {
		const contributionPrice = 60;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchRequestBody = {
			mode: 'save',
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		const expectedResult = {
			targetCatalogPrice: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 0,
			proratedRefundAmount: 60,
			discount: {
				discountedPrice: 60,
				discountPercentage: 50,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);

		const legacyInput: LegacyProductSwitchRequestBody = {
			preview: true,
			applyDiscountIfAvailable: true,
		};

		const legacyResult = await testLegacyCall(testData, legacyInput);

		const expectedLegacyResult = {
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

		expect(legacyResult).toEqual(expectedLegacyResult);
	});

	it('can preview an annual recurring contribution switch with 50% discount', async () => {
		const contributionPrice = 60;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchRequestBody = {
			mode: 'save',
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		const expectedResult = {
			targetCatalogPrice: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 0,
			proratedRefundAmount: 60,
			discount: {
				discountedPrice: 60,
				discountPercentage: 50,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);

		const legacyInput: LegacyProductSwitchRequestBody = {
			preview: true,
			applyDiscountIfAvailable: true,
		};

		const legacyResult = await testLegacyCall(testData, legacyInput);

		const expectedLegacyResult = {
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

		expect(legacyResult).toEqual(expectedLegacyResult);
	});

	it('can preview an annual recurring contribution (non UK - German) switch with 50% discount', async () => {
		const contributionPrice = 40;
		const testData = await createTestContribution(contributionPrice, {
			billingCountry: 'Germany',
			paymentMethod: 'visaCard',
		});
		const input: ProductSwitchRequestBody = {
			mode: 'save',
			targetProduct: 'SupporterPlus',
		};

		const result = await testPreview(testData, input);

		const expectedResult = {
			targetCatalogPrice: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
			amountPayableToday: 20,
			proratedRefundAmount: 40,
			discount: {
				discountPercentage: 50,
				discountedPrice: 60,
				upToPeriods: 1,
				upToPeriodsType: 'Years',
			},
		};

		expect(result).toEqual(expectedResult);

		const legacyInput: LegacyProductSwitchRequestBody = {
			preview: true,
			applyDiscountIfAvailable: true,
		};

		const legacyResult = await testLegacyCall(testData, legacyInput);

		const expectedLegacyResult = {
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

		expect(legacyResult).toEqual(expectedLegacyResult);
	});

	it('preview of annual recurring contribution switch with 50% discount fails validation check if from a high amount', async () => {
		const contributionPrice = 200;
		const testData = await createTestContribution(contributionPrice);
		const input: ProductSwitchRequestBody = {
			mode: 'save',
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
				const input: ProductSwitchRequestBody = {
					mode: 'switchToBasePrice',
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
				// should take the extra payment
				...testData,
				subscription: subscriptionAfter,
			});
		},
		1000 * 60,
	);

	it(
		'can switch a recurring contribution that is part way into its term to S+',
		async () => {
			const contributionPrice = 120;
			const nextMonth = dayjs().subtract(3, 'month').endOf('day');
			const testData = await createTestContribution(
				contributionPrice,
				{
					termLength: 6,
				},
				nextMonth,
			);

			const input: ProductSwitchRequestBody = {
				mode: 'switchToBasePrice',
				targetProduct: 'SupporterPlus',
			};

			const response = await testSwitch(testData, input);

			expect(response.message).toContain('Product move completed successfully');
		},
		1000 * 60,
	);

	it(
		'can switch a recurring contribution with pending amount change',
		async () => {
			const contributionPrice = 120;
			const testData = await createTestContribution(contributionPrice);

			const nextMonth = zuoraDateFormat(dayjs().add(1, 'month').endOf('day'));
			await addAmountChange(testData, nextMonth);

			const input: ProductSwitchRequestBody = {
				mode: 'switchWithPriceOverride',
				targetProduct: 'SupporterPlus',
				newAmount: 120.1, // should get written off
			};

			const response = await testSwitch(testData, input);

			expect(response.message).toContain('Product move completed successfully');
		},
		1000 * 60,
	);
});

const emptyRequestContext = {
	accountId: '',
	apiId: '',
	authorizer: undefined,
	protocol: '',
	httpMethod: '',
	identity: {
		accessKey: null,
		accountId: null,
		apiKey: null,
		apiKeyId: null,
		caller: null,
		clientCert: null,
		cognitoAuthenticationProvider: null,
		cognitoAuthenticationType: null,
		cognitoIdentityId: null,
		cognitoIdentityPoolId: null,
		principalOrgId: null,
		sourceIp: '',
		user: null,
		userAgent: null,
		userArn: null,
	},
	path: '',
	stage: '',
	requestId: '',
	requestTimeEpoch: 0,
	resourceId: '',
	resourcePath: '',
};
