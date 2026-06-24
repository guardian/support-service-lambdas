import {
	caStates,
	type IsoCountry,
} from '@modules/internationalisation/country';
import type {
	ZuoraTaxCode,
	ZuoraTaxPeriod,
	ZuoraTaxRate,
	ZuoraTaxRates,
} from '@modules/zuora/types/objects/tax';
import type { TaxRatesResponse } from '../src/schemas';

export const supporterPlusTaxCodeId = '8ad0887181de06d70181de659fb63b57';
export const supporterPlusTaxEngineId = '8ad095dd81de1cf00181de66e7404253';

export const zuoraTaxCodeSupporterPlus: ZuoraTaxCode = {
	id: supporterPlusTaxCodeId,
	taxEngineId: '2c92c0f94568f996014570f746f75c52',
	active: true,
	name: 'Supporter Plus',
	description: '',
};

export const zuoraTaxCodePeriod: ZuoraTaxPeriod = {
	id: supporterPlusTaxEngineId,
	startDate: '2022-07-08',
	endDate: null,
	taxCodeId: supporterPlusTaxCodeId,
};

export const zuoraTaxRateSupporterPlus: ZuoraTaxRate = {
	id: '8ad095dd81de1cf00181de66f5cf43b4',
	taxRatePeriodId: supporterPlusTaxEngineId,
	country: 'Canada',
	state: 'Ontario',
	taxRate1: 0.13,
};

export const canadianCountryStates: TaxRatesResponse = {
	AB: 0.05,
	BC: 0.12,
	MB: 0.12,
	NB: 0.15,
	NL: 0.15,
	NT: 0.05,
	NS: 0.14,
	NU: 0.05,
	ON: 0.13,
	PE: 0.15,
	QC: 0.1475,
	SK: 0.11,
	YT: 0.05,
};
export function canadianZuoraTaxRates(): ZuoraTaxRates {
	return {
		taxRates: Object.keys(canadianCountryStates).map((state) =>
			canadianZuoraTaxRate(
				state as keyof TaxRatesResponse,
				canadianCountryStates,
			),
		),
	};
}

function canadianZuoraTaxRate(
	state: keyof TaxRatesResponse,
	cadTaxRates: TaxRatesResponse,
): ZuoraTaxRate {
	return {
		id: '8ad095dd81de1cf00181de66f5cf43b4',
		taxRatePeriodId: supporterPlusTaxEngineId,
		country: 'Canada',
		state: caStates[state] ?? null,
		taxRate1: cadTaxRates[state],
	};
}

export const countryStates: Partial<Record<IsoCountry, TaxRatesResponse>> = {
	CA: canadianCountryStates,
};
