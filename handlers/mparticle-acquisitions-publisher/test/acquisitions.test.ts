import {
	acquisitionEventSchema,
	type AcquisitionProduct,
} from '../src/acquisitionEvent';
import {
	buildMParticleBatch,
	type MParticleMappingConfiguration,
} from '../src/acquisitions';

const configuration: MParticleMappingConfiguration = {
	googleEnhancedConversionsConversionActionId: '123456789',
};

const googleRemarketingVendorId = '5ed0eb688a76503f1016578f';
const metaVendorId = '5e7e1298b8e05c54a85c52d2';

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

const tcfv2Snapshot = {
	capturedAt: '2026-10-12T14:13:08.848Z',
	consentManagerVersion: '1.0.0',
	framework: 'tcfv2',
	gpcSignal: null,
	tcfv2: {
		gdprApplies: true,
		consents: { '1': true, '2': false, '3': false, '4': false, '7': true },
		vendorConsents: {
			[googleRemarketingVendorId]: true,
			[metaVendorId]: true,
		},
		eventStatus: 'tcloaded',
		addtlConsent: '2~~dv.',
	},
	usnat: null,
	aus: null,
} satisfies NonNullable<AcquisitionProduct['cmpConsentSnapshot']>;

const consentSnapshots: Array<
	[string, NonNullable<AcquisitionProduct['cmpConsentSnapshot']>]
> = [
	['TCFv2', tcfv2Snapshot],
	[
		'USNAT',
		{
			capturedAt: '2026-10-12T14:13:08.848Z',
			consentManagerVersion: '1.0.0',
			framework: 'usnat',
			gpcSignal: true,
			usnat: { doNotSell: true, signalStatus: 'ready' },
		},
	],
	[
		'AUS',
		{
			capturedAt: '2026-10-12T14:13:08.848Z',
			consentManagerVersion: '1.0.0',
			framework: 'aus',
			gpcSignal: false,
			aus: { personalisedAdvertising: true, signalStatus: 'ready' },
		},
	],
];

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
			consent_state: {
				gdpr: {
					paid_media_conversion_measurement_google: {
						consented: false,
						timestamp_unixtime_ms: Date.parse(acquisition.eventTimeStamp),
					},
					paid_media_conversion_measurement_meta: {
						consented: false,
						timestamp_unixtime_ms: Date.parse(acquisition.eventTimeStamp),
					},
				},
			},
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
		expect(event.data.custom_attributes).not.toHaveProperty(
			'cmp_consent_snapshot',
		);
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

	it.each(consentSnapshots)(
		'preserves the full %s snapshot and creates its consent state',
		(framework, snapshot) => {
			const parsedAcquisition = acquisitionEventSchema.parse({
				detail: { ...acquisition, cmpConsentSnapshot: snapshot },
			}).detail;
			const batch = buildMParticleBatch(parsedAcquisition, configuration);
			const event = batch.events[0];
			const snapshotAttribute =
				event.data.custom_attributes.cmp_consent_snapshot;
			const expectedConsent = framework === 'TCFv2';

			expect(typeof snapshotAttribute).toBe('string');
			expect(JSON.parse(snapshotAttribute as string)).toEqual(snapshot);
			expect(event.data).not.toHaveProperty('consent_state');
			expect(batch.consent_state?.gdpr).toEqual({
				paid_media_conversion_measurement_google: {
					consented: expectedConsent,
					timestamp_unixtime_ms: Date.parse(snapshot.capturedAt),
				},
				paid_media_conversion_measurement_meta: {
					consented: expectedConsent,
					timestamp_unixtime_ms: Date.parse(snapshot.capturedAt),
				},
			});
			expect(event.data.custom_attributes.similar_products_consent).toBe(true);
			expect(event.data.custom_flags).toMatchObject({
				'GoogleEnhancedConversions.Gclid': 'google-click-id',
				'Facebook.BrowserId': 'fb.1.1234567890.browser-id',
				'Facebook.ClickId': 'fb.1.1789467630123.facebook-click-id',
			});
		},
	);

	it('grants Google and Meta independently from purpose 7 and each vendor choice', () => {
		const googleOnly = buildMParticleBatch(
			{
				...acquisition,
				cmpConsentSnapshot: {
					...tcfv2Snapshot,
					tcfv2: {
						...tcfv2Snapshot.tcfv2,
						vendorConsents: { [googleRemarketingVendorId]: true },
					},
				},
			},
			configuration,
		).consent_state?.gdpr;
		const metaOnly = buildMParticleBatch(
			{
				...acquisition,
				cmpConsentSnapshot: {
					...tcfv2Snapshot,
					tcfv2: {
						...tcfv2Snapshot.tcfv2,
						vendorConsents: { [metaVendorId]: true },
					},
				},
			},
			configuration,
		).consent_state?.gdpr;

		expect(
			googleOnly?.paid_media_conversion_measurement_google?.consented,
		).toBe(true);
		expect(googleOnly?.paid_media_conversion_measurement_meta?.consented).toBe(
			false,
		);
		expect(metaOnly?.paid_media_conversion_measurement_google?.consented).toBe(
			false,
		);
		expect(metaOnly?.paid_media_conversion_measurement_meta?.consented).toBe(
			true,
		);
	});

	it.each([
		['purpose 2 only', { '2': true }],
		['purpose 3 only', { '3': true }],
		['purpose 4 only', { '4': true }],
		['purpose 7 missing', { '2': true, '3': true, '4': true }],
		['purpose 7 false', { '2': true, '3': true, '4': true, '7': false }],
		['purpose 7 null', { '2': true, '3': true, '4': true, '7': null }],
	])('does not grant measurement from %s', (_label, consents) => {
		const parsedAcquisition = acquisitionEventSchema.parse({
			detail: {
				...acquisition,
				cmpConsentSnapshot: {
					...tcfv2Snapshot,
					tcfv2: {
						...tcfv2Snapshot.tcfv2,
						consents: consents as Record<string, boolean>,
					},
				},
			},
		}).detail;
		const state = buildMParticleBatch(parsedAcquisition, configuration)
			.consent_state?.gdpr;

		expect(state?.paid_media_conversion_measurement_google?.consented).toBe(
			false,
		);
		expect(state?.paid_media_conversion_measurement_meta?.consented).toBe(
			false,
		);
	});

	it.each([
		[
			'GDPR applicability missing',
			{
				...tcfv2Snapshot,
				tcfv2: {
					consents: tcfv2Snapshot.tcfv2.consents,
					vendorConsents: tcfv2Snapshot.tcfv2.vendorConsents,
					eventStatus: tcfv2Snapshot.tcfv2.eventStatus,
					addtlConsent: tcfv2Snapshot.tcfv2.addtlConsent,
				},
			},
			Date.parse(acquisition.eventTimeStamp),
		],
		[
			'vendor consent null',
			{
				...tcfv2Snapshot,
				tcfv2: {
					...tcfv2Snapshot.tcfv2,
					vendorConsents: { [googleRemarketingVendorId]: null },
				},
			},
			Date.parse(acquisition.eventTimeStamp),
		],
		[
			'vendor denied',
			{
				...tcfv2Snapshot,
				tcfv2: {
					...tcfv2Snapshot.tcfv2,
					vendorConsents: {
						[googleRemarketingVendorId]: false,
						[metaVendorId]: false,
					},
				},
			},
			Date.parse(tcfv2Snapshot.capturedAt),
		],
		[
			'GDPR not applicable',
			{
				...tcfv2Snapshot,
				tcfv2: { ...tcfv2Snapshot.tcfv2, gdprApplies: false },
			},
			Date.parse(tcfv2Snapshot.capturedAt),
		],
		[
			'capture time invalid',
			{ ...tcfv2Snapshot, capturedAt: 'not-a-timestamp' },
			Date.parse(acquisition.eventTimeStamp),
		],
	])('fails closed when %s', (_label, snapshot, expectedTimestamp) => {
		const batch = buildMParticleBatch(
			acquisitionEventSchema.parse({
				detail: { ...acquisition, cmpConsentSnapshot: snapshot },
			}).detail,
			configuration,
		);
		expect(batch.consent_state?.gdpr).toEqual({
			paid_media_conversion_measurement_google: {
				consented: false,
				timestamp_unixtime_ms: expectedTimestamp,
			},
			paid_media_conversion_measurement_meta: {
				consented: false,
				timestamp_unixtime_ms: expectedTimestamp,
			},
		});
	});

	it.each([
		[
			'USNAT with doNotSell false and no GPC signal',
			{
				capturedAt: '2026-10-12T14:13:08.848Z',
				consentManagerVersion: '1.0.0',
				framework: 'usnat',
				gpcSignal: null,
				usnat: { doNotSell: false, signalStatus: 'ready' },
			},
		],
		[
			'AUS with personalised advertising true',
			{
				capturedAt: '2026-10-12T14:13:08.848Z',
				consentManagerVersion: '1.0.0',
				framework: 'aus',
				gpcSignal: false,
				aus: { personalisedAdvertising: true, signalStatus: 'ready' },
			},
		],
	])('does not infer GDPR measurement from %s', (_label, snapshot) => {
		const batch = buildMParticleBatch(
			acquisitionEventSchema.parse({
				detail: { ...acquisition, cmpConsentSnapshot: snapshot },
			}).detail,
			configuration,
		);

		expect(batch.consent_state?.gdpr).toEqual({
			paid_media_conversion_measurement_google: {
				consented: false,
				timestamp_unixtime_ms: Date.parse(snapshot.capturedAt),
			},
			paid_media_conversion_measurement_meta: {
				consented: false,
				timestamp_unixtime_ms: Date.parse(snapshot.capturedAt),
			},
		});
	});

	it('keeps explicit null consent unknown and accepts older events without it', () => {
		const withNullSnapshot = acquisitionEventSchema.parse({
			detail: { ...acquisition, cmpConsentSnapshot: null },
		}).detail;
		const withMissingSnapshot = acquisitionEventSchema.parse({
			detail: acquisition,
		}).detail;
		const nullSnapshotBatch = buildMParticleBatch(
			withNullSnapshot,
			configuration,
		);
		const olderBatch = buildMParticleBatch(withMissingSnapshot, configuration);
		const nullSnapshotEvent = nullSnapshotBatch.events[0];
		const olderEvent = olderBatch.events[0];

		expect(nullSnapshotEvent.data.custom_attributes).toHaveProperty(
			'cmp_consent_snapshot',
			'null',
		);
		expect(olderEvent.data.custom_attributes).not.toHaveProperty(
			'cmp_consent_snapshot',
		);
		expect(olderBatch.consent_state?.gdpr).toMatchObject({
			paid_media_conversion_measurement_google: {
				consented: false,
				timestamp_unixtime_ms: Date.parse(acquisition.eventTimeStamp),
			},
			paid_media_conversion_measurement_meta: {
				consented: false,
				timestamp_unixtime_ms: Date.parse(acquisition.eventTimeStamp),
			},
		});
		expect(olderEvent.data.custom_attributes.similar_products_consent).toBe(
			true,
		);
	});

	it('converts an unreadable snapshot to unknown without rejecting the acquisition', () => {
		const parsedAcquisition = acquisitionEventSchema.parse({
			detail: {
				...acquisition,
				cmpConsentSnapshot: { framework: 'unknown' },
			},
		}).detail;
		const batch = buildMParticleBatch(parsedAcquisition, configuration);
		const event = batch.events[0];

		expect(event.data.custom_attributes.cmp_consent_snapshot).toBe('null');
		expect(event.data.custom_attributes.similar_products_consent).toBe(true);
		expect(
			batch.consent_state?.gdpr?.paid_media_conversion_measurement_google
				?.consented,
		).toBe(false);
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
		const tcfv2Snapshot = consentSnapshots[0]?.[1];
		if (!tcfv2Snapshot) {
			throw new Error('TCFv2 consent snapshot fixture is missing');
		}

		expect(first.source_request_id).toBe(second.source_request_id);
		expect(first.source_request_id).toHaveLength(64);
		expect(first.events[0].data.product_action.transaction_id).toBe('A-S123');
		expect(
			buildMParticleBatch(
				{ ...withoutIds, cmpConsentSnapshot: tcfv2Snapshot },
				configuration,
			).source_request_id,
		).toBe(first.source_request_id);
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
