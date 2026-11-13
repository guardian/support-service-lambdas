import { createHash } from 'node:crypto';
import type {
	MParticleEnvironment,
	MParticleEventBatch,
} from '@modules/mparticle/events';
import type { AcquisitionProduct } from './acquisitionEvent';

export type MParticleMappingConfiguration = {
	googleEnhancedConversionsConversionActionId: string;
};

type MParticleAttribute = string | number | boolean;

type MParticleProduct = {
	id: string;
	name: string;
	quantity: number;
	price?: number;
};

type MParticleProductAction = {
	action: 'purchase';
	products: MParticleProduct[];
	transaction_id: string;
	total_amount?: number;
};

type MParticleCommerceEvent = {
	event_type: 'commerce_event';
	data: {
		event_name: 'purchase';
		product_action: MParticleProductAction;
		currency_code: string;
		timestamp_unixtime_ms: number;
		source_message_id: string;
		custom_attributes: Record<string, MParticleAttribute>;
		custom_flags: Record<string, string>;
	};
};

/**
 * An mParticle event batch as produced by this handler: the shared Events API
 * model narrowed to the single commerce event we send per acquisition.
 */
export type AcquisitionEventBatch = Omit<
	MParticleEventBatch,
	'events' | 'source_request_id'
> & {
	source_request_id: string;
	events: [MParticleCommerceEvent];
};

const parameterNames = (...names: string[]) =>
	new Set(names.map((name) => name.toLowerCase()));

function findQueryParameter(
	acquisition: AcquisitionProduct,
	...names: string[]
): string | undefined {
	const wantedNames = parameterNames(...names);
	return acquisition.queryParameters.find(
		({ name, value }) =>
			wantedNames.has(name.toLowerCase()) && value.trim().length > 0,
	)?.value;
}

function parseEventTimestamp(eventTimeStamp: string): number {
	const normalised = eventTimeStamp
		.replace(/ UTC$/, 'Z')
		.replace(' ', 'T')
		.replace(/\.(\d{3})\d+(Z)$/, '.$1$2');
	const timestamp = Date.parse(normalised);
	if (!Number.isFinite(timestamp)) {
		throw new Error('Acquisition event has an invalid eventTimeStamp');
	}
	return timestamp;
}

function nonEmpty(value: string | null | undefined): string | undefined {
	return value && value.trim().length > 0 ? value : undefined;
}

function firstNonEmpty(
	...values: Array<string | null | undefined>
): string | undefined {
	return values.map(nonEmpty).find((value) => value !== undefined);
}

function eventIdentifier(acquisition: AcquisitionProduct): string {
	const explicitIdentifier = firstNonEmpty(
		acquisition.paymentId,
		acquisition.contributionId,
		acquisition.paypalTransactionId,
	);
	if (explicitIdentifier) {
		return explicitIdentifier;
	}

	return createHash('sha256').update(JSON.stringify(acquisition)).digest('hex');
}

function transactionIdentifier(
	acquisition: AcquisitionProduct,
	eventId: string,
): string {
	return (
		firstNonEmpty(
			acquisition.paymentId,
			acquisition.contributionId,
			acquisition.paypalTransactionId,
			acquisition.zuoraSubscriptionNumber,
		) ?? eventId
	);
}

function eventSourceUrl(acquisition: AcquisitionProduct): string | undefined {
	const suppliedUrl = findQueryParameter(
		acquisition,
		'event_source_url',
		'eventSourceUrl',
		'page_url',
		'pageUrl',
	);
	if (
		suppliedUrl?.startsWith('http://') ||
		suppliedUrl?.startsWith('https://')
	) {
		return suppliedUrl;
	}

	const hostname = nonEmpty(acquisition.hostname);
	return hostname ? `https://${hostname}` : undefined;
}

function formattedFacebookClickId(
	acquisition: AcquisitionProduct,
	eventTimestamp: number,
): string | undefined {
	const suppliedClickId = findQueryParameter(acquisition, 'fbc', '_fbc');
	if (suppliedClickId) {
		return suppliedClickId;
	}

	const fbclid = findQueryParameter(acquisition, 'fbclid');
	return fbclid ? `fb.1.${eventTimestamp}.${fbclid}` : undefined;
}

function customAttributes(
	acquisition: AcquisitionProduct,
): Record<string, MParticleAttribute> {
	const attributes: Record<string, MParticleAttribute> = {};
	const add = (name: string, value: unknown) => {
		if (value === undefined || value === null) {
			return;
		}
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			attributes[name] = value;
			return;
		}
		attributes[name] = JSON.stringify(value);
	};

	add('event_timestamp', acquisition.eventTimeStamp);
	add('product', acquisition.product);
	add('amount', acquisition.amount);
	add('country', acquisition.country);
	add('currency', acquisition.currency);
	add('component_id', acquisition.componentId);
	add('component_type', acquisition.componentType);
	add('campaign_code', acquisition.campaignCode);
	add('source', acquisition.source);
	add('referrer_url', acquisition.referrerUrl);
	add('hostname', acquisition.hostname);
	add('user_agent', acquisition.userAgent);
	add('ip_address', acquisition.ipAddress);
	add('ab_tests', acquisition.abTests);
	add('payment_frequency', acquisition.paymentFrequency);
	add('payment_provider', acquisition.paymentProvider);
	add('print_options', acquisition.printOptions);
	add('browser_id', acquisition.browserId);
	add('identity_id', acquisition.identityId);
	add('page_view_id', acquisition.pageViewId);
	add('referrer_page_view_id', acquisition.referrerPageViewId);
	add('labels', acquisition.labels);
	add('promo_code', acquisition.promoCode);
	add(
		'reused_existing_payment_method',
		acquisition.reusedExistingPaymentMethod,
	);
	add('reader_type', acquisition.readerType);
	add('acquisition_type', acquisition.acquisitionType);
	add('zuora_subscription_number', acquisition.zuoraSubscriptionNumber);
	add('contribution_id', acquisition.contributionId);
	add('payment_id', acquisition.paymentId);
	add('query_parameters', acquisition.queryParameters);
	add('platform', acquisition.platform);
	add('postal_code', acquisition.postalCode);
	add('state', acquisition.state);
	add('email', acquisition.email);
	add('similar_products_consent', acquisition.similarProductsConsent);
	add('paypal_transaction_id', acquisition.paypalTransactionId);

	return attributes;
}

function userAttributes(
	acquisition: AcquisitionProduct,
): Record<string, string> {
	const attributes: Record<string, string> = {};
	const add = (name: string, value: string | null | undefined) => {
		const presentValue = nonEmpty(value);
		if (presentValue) {
			attributes[name] = presentValue;
		}
	};

	add('$country', acquisition.country);
	add('$state', acquisition.state);
	add('$zip', acquisition.postalCode);

	return attributes;
}

function userIdentities(
	acquisition: AcquisitionProduct,
): Record<string, string> {
	const identities: Record<string, string> = {};
	const add = (name: string, value: string | null | undefined) => {
		const presentValue = nonEmpty(value);
		if (presentValue) {
			identities[name] = presentValue;
		}
	};

	add('customer_id', acquisition.identityId);
	add('email', acquisition.email);

	return identities;
}

function customFlags(
	acquisition: AcquisitionProduct,
	configuration: MParticleMappingConfiguration,
	eventTimestamp: number,
): Record<string, string> {
	const flags: Record<string, string> = {
		'GoogleEnhancedConversions.ConversionActionId':
			configuration.googleEnhancedConversionsConversionActionId,
	};

	const gclid = findQueryParameter(acquisition, 'gclid');
	const gbraid = findQueryParameter(acquisition, 'gbraid');
	const wbraid = findQueryParameter(acquisition, 'wbraid');
	if (gclid) {
		flags['GoogleEnhancedConversions.Gclid'] = gclid;
	} else if (gbraid) {
		flags['GoogleEnhancedConversions.Gbraid'] = gbraid;
	} else if (wbraid) {
		flags['GoogleEnhancedConversions.Wbraid'] = wbraid;
	}

	const fbp = findQueryParameter(acquisition, 'fbp', '_fbp');
	if (fbp) {
		flags['Facebook.BrowserId'] = fbp;
	}

	const fbc = formattedFacebookClickId(acquisition, eventTimestamp);
	if (fbc) {
		flags['Facebook.ClickId'] = fbc;
	}

	const sourceUrl = eventSourceUrl(acquisition);
	if (sourceUrl) {
		flags['Facebook.ActionSource'] = 'website';
		flags['Facebook.EventSourceUrl'] = sourceUrl;
	}
	const userAgent = nonEmpty(acquisition.userAgent);
	if (userAgent) {
		flags['Facebook.ClientUserAgent'] = userAgent;
	}

	return flags;
}

export function buildMParticleBatch(
	acquisition: AcquisitionProduct,
	configuration: MParticleMappingConfiguration,
	environment: MParticleEnvironment = 'development',
): AcquisitionEventBatch {
	const eventTimestamp = parseEventTimestamp(acquisition.eventTimeStamp);
	const eventId = eventIdentifier(acquisition);
	const transactionId = transactionIdentifier(acquisition, eventId);
	const product: MParticleProduct = {
		id: acquisition.product,
		name: acquisition.product,
		quantity: 1,
		...(acquisition.amount === undefined || acquisition.amount === null
			? {}
			: { price: acquisition.amount }),
	};
	const productAction: MParticleProductAction = {
		action: 'purchase',
		products: [product],
		transaction_id: transactionId,
		...(acquisition.amount === undefined || acquisition.amount === null
			? {}
			: { total_amount: acquisition.amount }),
	};
	const attributes = userAttributes(acquisition);
	const identities = userIdentities(acquisition);
	const userAgent = nonEmpty(acquisition.userAgent);
	const ipAddress = nonEmpty(acquisition.ipAddress);
	const commerceEvent: MParticleCommerceEvent = {
		event_type: 'commerce_event',
		data: {
			event_name: 'purchase',
			product_action: productAction,
			currency_code: acquisition.currency,
			timestamp_unixtime_ms: eventTimestamp,
			source_message_id: eventId,
			custom_attributes: customAttributes(acquisition),
			custom_flags: customFlags(acquisition, configuration, eventTimestamp),
		},
	};

	return {
		schema_version: 2,
		source_request_id: eventId,
		environment,
		events: [commerceEvent],
		...(Object.keys(attributes).length > 0
			? { user_attributes: attributes }
			: {}),
		...(Object.keys(identities).length > 0
			? { user_identities: identities }
			: {}),
		...(userAgent
			? {
					device_info: {
						platform: 'web' as const,
						http_header_user_agent: userAgent,
					},
				}
			: {}),
		...(ipAddress ? { ip: ipAddress } : {}),
	};
}
