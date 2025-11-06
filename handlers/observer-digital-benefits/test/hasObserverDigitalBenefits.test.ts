/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 */
import { hasObserverDigitalBenefits } from '../src';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn().mockReturnValue('CODE'),
}));

test('hasObserverDigitalBenefits', () => {
	expect(
		hasObserverDigitalBenefits({
			zuoraProduct: 'SubscriptionCard',
			productRatePlan: 'Everyday',
			billingSystem: 'zuora',
			id: '2c92c0f854bbfecb0154c1f3e1d329d1',
		}),
	).toEqual(true);
});
