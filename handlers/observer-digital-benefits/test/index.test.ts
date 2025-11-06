/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 */
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { buildResponse, hasObserverDigitalBenefits } from '../src';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn().mockReturnValue('CODE'),
}));

describe('hasObserverDigitalBenefits', () => {
	test('SubscriptionCard Everyday plan ', () => {
		expect(
			hasObserverDigitalBenefits({
				zuoraProduct: 'SubscriptionCard',
				productRatePlan: 'Everyday',
				billingSystem: 'zuora',
				id: '2c92c0f854bbfecb0154c1f3e1d329d1',
			}),
		).toEqual(true);
	});
	test('DigitalSubscription Monthly plan ', () => {
		expect(
			hasObserverDigitalBenefits({
				zuoraProduct: 'DigitalSubscription',
				productRatePlan: 'Monthly',
				billingSystem: 'zuora',
				id: '2c92c0f854bbfecb0154c1f3e1d329d1',
			}),
		).toEqual(false);
	});
	test('HomeDelivery Sixday plan ', () => {
		expect(
			hasObserverDigitalBenefits({
				zuoraProduct: 'HomeDelivery',
				productRatePlan: 'Sixday',
				billingSystem: 'zuora',
				id: '2c92c0f854bbfecb0154c1f3e1d329d1',
			}),
		).toEqual(false);
	});
});

describe('buildResponse', () => {
	test('term end date less than a month in the future is returned unchanged', () => {
		const nearTermEndDate = dayjs().add(10, 'day');
		const isoDateString = zuoraDateFormat(nearTermEndDate);
		expect(buildResponse(true, isoDateString)).toStrictEqual({
			statusCode: 200,
			body: JSON.stringify({
				active: true,
				validUntil: isoDateString,
			}),
		});
	});
	test('term end date more than a month in the future is capped to one month from now', () => {
		const farTermEndDate = dayjs().add(2, 'months');
		const cappedValidUntilDate = dayjs().add(1, 'month');
		const farIsoDateString = zuoraDateFormat(farTermEndDate);
		const cappedIsoDateString = zuoraDateFormat(cappedValidUntilDate);
		expect(buildResponse(true, farIsoDateString)).toStrictEqual({
			statusCode: 200,
			body: JSON.stringify({
				active: true,
				validUntil: cappedIsoDateString,
			}),
		});
	});
	test('subscription without benefits returns null validUntil', () => {
		expect(buildResponse(false)).toStrictEqual({
			statusCode: 200,
			body: JSON.stringify({
				active: false,
			}),
		});
	});
});
