import type { AcquisitionProduct } from '../src/acquisitionEvent';
import {
	buildMParticleBatch,
	type MParticleMappingConfiguration,
} from '../src/acquisitions';

const configuration: MParticleMappingConfiguration = {
	googleEnhancedConversionsConversionActionId: '123456789',
};

const acquisition: AcquisitionProduct = {
	eventTimeStamp: '2026-09-15T10:20:30.123Z',
	product: 'RECURRING_CONTRIBUTION',
	amount: 12.5,
	country: 'GB',
	currency: 'GBP',
	componentId: 'component-id',
	componentType: 'SUPPORT',
	campaignCode: 'campaign-code',
	source: 'google',
	referrerUrl: 'https://www.theguardian.com/',
	hostname: 'support.theguardian.com',
	userAgent: 'test-user-agent',
	ipAddress: '192.0.2.1',
	abTests: [{ name: 'test', variant: 'control' }],
	paymentFrequency: 'MONTHLY',
	paymentProvider: 'STRIPE',
	printOptions: null,
	browserId: 'browser-id',
	identityId: 'identity-id',
	pageViewId: 'page-view-id',
	referrerPageViewId: 'referrer-page-view-id',
	labels: ['label'],
	promoCode: 'promo-code',
	reusedExistingPaymentMethod: false,
	readerType: 'Direct',
	acquisitionType: 'Purchase',
	zuoraSubscriptionNumber: 'A-S123',
	contributionId: 'contribution-id',
	paymentId: 'payment-id',
	queryParameters: [
		{ name: 'gclid', value: 'google-click-id' },
		{ name: 'fbclid', value: 'facebook-click-id' },
		{ name: 'fbp', value: 'fb.1.1234567890.browser-id' },
	],
	platform: 'SUPPORT',
	postalCode: 'SW1A 1AA',
	state: 'London',
	email: 'reader@example.com',
	similarProductsConsent: true,
	paypalTransactionId: null,
};

describe('buildMParticleBatch', () => {
	it('maps a complete acquisition into a purchase event', () => {
		const batch = buildMParticleBatch(acquisition, configuration, 'production');
		const event = batch.events[0];

		expect(batch).toMatchObject({
			schema_version: 2,
			environment: 'production',
			user_attributes: {
				$country: 'GB',
				$state: 'London',
				$zip: 'SW1A 1AA',
			},
			user_identities: {
				customer_id: 'identity-id',
				email: 'reader@example.com',
			},
			device_info: {
				platform: 'web',
				http_header_user_agent: 'test-user-agent',
			},
			ip: '192.0.2.1',
		});
		expect(event.data).toMatchObject({
			event_name: 'purchase',
			currency_code: 'GBP',
			timestamp_unixtime_ms: Date.parse(acquisition.eventTimeStamp),
			product_action: {
				action: 'purchase',
				transaction_id: 'payment-id',
				total_amount: 12.5,
				products: [
					{
						id: 'RECURRING_CONTRIBUTION',
						name: 'RECURRING_CONTRIBUTION',
						quantity: 1,
						price: 12.5,
					},
				],
			},
			custom_flags: {
				'GoogleEnhancedConversions.Gclid': 'google-click-id',
				'GoogleEnhancedConversions.ConversionActionId': '123456789',
				'Facebook.BrowserId': 'fb.1.1234567890.browser-id',
				'Facebook.ClickId': 'fb.1.1789467630123.facebook-click-id',
				'Facebook.ActionSource': 'website',
				'Facebook.EventSourceUrl': 'https://support.theguardian.com',
				'Facebook.ClientUserAgent': 'test-user-agent',
			},
		});
		expect(event.data.custom_flags).not.toHaveProperty('fbclid');
		expect(event.data.custom_attributes).toMatchObject({
			event_timestamp: acquisition.eventTimeStamp,
			product: 'RECURRING_CONTRIBUTION',
			amount: 12.5,
			country: 'GB',
			currency: 'GBP',
			component_id: 'component-id',
			component_type: 'SUPPORT',
			campaign_code: 'campaign-code',
			source: 'google',
			referrer_url: 'https://www.theguardian.com/',
			hostname: 'support.theguardian.com',
			user_agent: 'test-user-agent',
			ip_address: '192.0.2.1',
			ab_tests: JSON.stringify(acquisition.abTests),
			payment_frequency: 'MONTHLY',
			payment_provider: 'STRIPE',
			browser_id: 'browser-id',
			identity_id: 'identity-id',
			page_view_id: 'page-view-id',
			referrer_page_view_id: 'referrer-page-view-id',
			labels: JSON.stringify(acquisition.labels),
			promo_code: 'promo-code',
			reused_existing_payment_method: false,
			reader_type: 'Direct',
			acquisition_type: 'Purchase',
			zuora_subscription_number: 'A-S123',
			contribution_id: 'contribution-id',
			payment_id: 'payment-id',
			query_parameters: JSON.stringify(acquisition.queryParameters),
			platform: 'SUPPORT',
			postal_code: 'SW1A 1AA',
			state: 'London',
			email: 'reader@example.com',
			similar_products_consent: true,
		});
		expect(event.data.custom_attributes).not.toHaveProperty('print_options');
		expect(event.data.custom_attributes).not.toHaveProperty(
			'paypal_transaction_id',
		);
	});

	it('supports Facebook fbc and Google braid identifiers', () => {
		const eventWithFbc = buildMParticleBatch(
			{
				...acquisition,
				queryParameters: [
					{ name: '_fbc', value: 'fb.1.1234567890.captured-click-id' },
					{ name: 'gbraid', value: 'google-braid-id' },
				],
			},
			configuration,
		).events[0];

		expect(eventWithFbc.data.custom_flags).toMatchObject({
			'Facebook.ClickId': 'fb.1.1234567890.captured-click-id',
			'GoogleEnhancedConversions.Gbraid': 'google-braid-id',
		});
		expect(eventWithFbc.data.custom_flags).not.toHaveProperty(
			'GoogleEnhancedConversions.Gclid',
		);

		const eventWithWbraid = buildMParticleBatch(
			{
				...acquisition,
				queryParameters: [{ name: 'wbraid', value: 'google-web-to-app-id' }],
			},
			configuration,
		).events[0];

		expect(eventWithWbraid.data.custom_flags).toMatchObject({
			'GoogleEnhancedConversions.Wbraid': 'google-web-to-app-id',
		});
	});

	it('matches query parameters case-insensitively and skips empty duplicates', () => {
		const event = buildMParticleBatch(
			{
				...acquisition,
				queryParameters: [
					{ name: 'GCLID', value: '' },
					{ name: 'gClId', value: 'chosen-google-click-id' },
				],
			},
			configuration,
		).events[0];

		expect(event.data.custom_flags).toMatchObject({
			'GoogleEnhancedConversions.Gclid': 'chosen-google-click-id',
		});
	});

	it('omits website context when browser metadata is unavailable', () => {
		const event = buildMParticleBatch(
			{
				...acquisition,
				hostname: undefined,
				userAgent: undefined,
				ipAddress: undefined,
				queryParameters: [{ name: 'gclid', value: 'google-click-id' }],
			},
			configuration,
		).events[0];

		expect(event.data.custom_flags).not.toHaveProperty('Facebook.ActionSource');
		expect(event.data.custom_flags).not.toHaveProperty(
			'Facebook.EventSourceUrl',
		);
		expect(event.data.custom_flags).not.toHaveProperty(
			'Facebook.ClientUserAgent',
		);
	});

	it('omits commerce amounts when the source event has no amount', () => {
		const event = buildMParticleBatch(
			{ ...acquisition, amount: null },
			configuration,
		).events[0];

		expect(event.data.product_action).not.toHaveProperty('total_amount');
		expect(event.data.product_action.products[0]).not.toHaveProperty('price');
	});

	it('uses a stable event hash when no payment identifier is available', () => {
		const withoutIds = {
			...acquisition,
			paymentId: null,
			contributionId: null,
			paypalTransactionId: null,
		};
		const first = buildMParticleBatch(withoutIds, configuration);
		const second = buildMParticleBatch(withoutIds, configuration);

		expect(first.source_request_id).toBe(second.source_request_id);
		expect(first.source_request_id).toHaveLength(64);
		expect(first.events[0].data.product_action.transaction_id).toBe('A-S123');
	});

	it('rejects an invalid event timestamp while mapping', () => {
		expect(() =>
			buildMParticleBatch(
				{ ...acquisition, eventTimeStamp: 'not-a-date' },
				configuration,
			),
		).toThrow('invalid eventTimeStamp');
	});
});
