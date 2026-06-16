import type { IsoCountry } from '@modules/internationalisation/country';
import type {
	ZuoraTaxCode,
	ZuoraTaxPeriod,
	ZuoraTaxRate,
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
	county: null,
	city: null,
	postalCode: null,
	taxRegion: null,
	taxRate1: 0.13,
	taxRateType1: 'Percentage',
	taxName1: 'US TAX',
	taxJursdiction1: 'Country',
	taxLocationCode1: 'CA',
	taxRateDescription1: '',
	taxRate2: 0.0,
	taxRateType2: null,
	taxName2: null,
	taxJursdiction2: null,
	taxLocationCode2: null,
	taxRateDescription2: null,
	taxRate3: 0.0,
	taxRateType3: null,
	taxName3: null,
	taxJursdiction3: null,
	taxLocationCode3: null,
	taxRateDescription3: null,
};

export const canadianCountryStates: TaxRatesResponse = {
	NL: 0.15,
	SK: 0.11,
	YT: 0.05,
	NU: 0.05,
	PE: 0.15,
	AB: 0.05,
	BC: 0.12,
	MB: 0.12,
	NB: 0.15,
	NT: 0.15,
	NS: 0.15,
	ON: 0.13,
	QC: 0.1498,
};

export const countryStates: Partial<Record<IsoCountry, TaxRatesResponse>> = {
	CA: canadianCountryStates,
};
