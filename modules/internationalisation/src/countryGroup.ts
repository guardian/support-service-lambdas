import type { IsoCountry } from '@modules/internationalisation/country';
import type { IsoCurrency } from '@modules/internationalisation/currency';

// ----- Types ----- //
export const GBPCountries = 'GBPCountries';
export const UnitedStates = 'UnitedStates';
export const AUDCountries = 'AUDCountries';
export const EURCountries = 'EURCountries';
export const NZDCountries = 'NZDCountries';
export const Canada = 'Canada';
export const International = 'International';

export type CountryGroupId =
	| typeof GBPCountries
	| typeof UnitedStates
	| typeof AUDCountries
	| typeof EURCountries
	| typeof International
	| typeof NZDCountries
	| typeof Canada;

export type CountryGroupName =
	| 'United Kingdom'
	| 'United States'
	| 'Australia'
	| 'Europe'
	| 'International'
	| 'New Zealand'
	| 'Canada';

export enum SupportRegionId {
	UK = 'uk',
	US = 'us',
	AU = 'au',
	EU = 'eu',
	INT = 'int',
	NZ = 'nz',
	CA = 'ca',
}

export type CountryGroup = {
	name: CountryGroupName;
	currency: IsoCurrency;
	countries: IsoCountry[];
	supportRegionId: SupportRegionId;
};
type CountryGroups = Record<CountryGroupId, CountryGroup>;
export const countryGroups: CountryGroups = {
	GBPCountries: {
		name: 'United Kingdom',
		currency: 'GBP',
		countries: ['GB', 'FK', 'GI', 'GG', 'IM', 'JE', 'SH'],
		supportRegionId: SupportRegionId.UK,
	},
	UnitedStates: {
		name: 'United States',
		currency: 'USD',
		countries: ['US'],
		supportRegionId: SupportRegionId.US,
	},
	AUDCountries: {
		name: 'Australia',
		currency: 'AUD',
		countries: ['AU', 'KI', 'NR', 'NF', 'TV'],
		supportRegionId: SupportRegionId.AU,
	},
	EURCountries: {
		name: 'Europe',
		currency: 'EUR',
		countries: [
			'AD',
			'AL',
			'AT',
			'BA',
			'BE',
			'BG',
			'BL',
			'CH',
			'CY',
			'CZ',
			'DE',
			'DK',
			'EE',
			'ES',
			'FI',
			'FO',
			'FR',
			'GF',
			'GL',
			'GP',
			'GR',
			'HR',
			'HU',
			'IE',
			'IT',
			'LI',
			'LT',
			'LU',
			'LV',
			'MC',
			'ME',
			'MF',
			'IS',
			'MQ',
			'MT',
			'NL',
			'NO',
			'PF',
			'PL',
			'PM',
			'PT',
			'RE',
			'RO',
			'RS',
			'SE',
			'SI',
			'SJ',
			'SK',
			'SM',
			'TF',
			'WF',
			'YT',
			'VA',
			'AX',
			'AZ',
			'AM',
			'GE',
			'BY',
			'MD',
			'UA',
			'MK',
		],
		supportRegionId: SupportRegionId.EU,
	},
	International: {
		name: 'International',
		currency: 'USD',
		countries: [
			'AE',
			'AF',
			'AG',
			'AI',
			'AO',
			'AQ',
			'AR',
			'AS',
			'AW',
			'BB',
			'BD',
			'BF',
			'BH',
			'BI',
			'BJ',
			'BM',
			'BN',
			'BO',
			'BQ',
			'BR',
			'BS',
			'BT',
			'BV',
			'BW',
			'BZ',
			'CC',
			'CD',
			'CF',
			'CG',
			'CI',
			'CL',
			'CM',
			'CN',
			'CO',
			'CR',
			'CU',
			'CV',
			'CW',
			'CX',
			'DJ',
			'DM',
			'DO',
			'DZ',
			'EC',
			'EG',
			'EH',
			'ER',
			'ET',
			'FJ',
			'FM',
			'GA',
			'GD',
			'GH',
			'GM',
			'GN',
			'GQ',
			'GS',
			'GT',
			'GU',
			'GW',
			'GY',
			'HK',
			'HM',
			'HN',
			'HT',
			'ID',
			'IL',
			'IN',
			'IO',
			'IQ',
			'IR',
			'JM',
			'JO',
			'JP',
			'KE',
			'KG',
			'KH',
			'KM',
			'KN',
			'KP',
			'KR',
			'KW',
			'KY',
			'KZ',
			'LA',
			'LB',
			'LC',
			'LK',
			'LR',
			'LS',
			'LY',
			'MA',
			'MG',
			'MH',
			'ML',
			'MM',
			'MN',
			'MO',
			'MP',
			'MR',
			'MS',
			'MU',
			'MV',
			'MW',
			'MX',
			'MY',
			'MZ',
			'NA',
			'NC',
			'NE',
			'NG',
			'NI',
			'NP',
			'NU',
			'OM',
			'PA',
			'PE',
			'PG',
			'PH',
			'PK',
			'PN',
			'PR',
			'PS',
			'PW',
			'PY',
			'QA',
			'RU',
			'RW',
			'SA',
			'SB',
			'SC',
			'SD',
			'SG',
			'SL',
			'SN',
			'SO',
			'SR',
			'SS',
			'ST',
			'SV',
			'SX',
			'SY',
			'SZ',
			'TC',
			'TD',
			'TG',
			'TH',
			'TJ',
			'TK',
			'TL',
			'TM',
			'TN',
			'TO',
			'TR',
			'TT',
			'TW',
			'TZ',
			'UG',
			'UM',
			'UY',
			'UZ',
			'VC',
			'VE',
			'VG',
			'VI',
			'VN',
			'VU',
			'WS',
			'YE',
			'ZA',
			'ZM',
			'ZW',
		],
		supportRegionId: SupportRegionId.INT,
	},
	NZDCountries: {
		name: 'New Zealand',
		currency: 'NZD',
		countries: ['NZ', 'CK'],
		supportRegionId: SupportRegionId.NZ,
	},
	Canada: {
		name: 'Canada',
		currency: 'CAD',
		countries: ['CA'],
		supportRegionId: SupportRegionId.CA,
	},
} as const;
export const countryGroupBySupportInternationalisationId = (
	supportInternationalisationId: SupportInternationalisationId,
): CountryGroup => {
	switch (supportInternationalisationId) {
		case 'uk':
			return countryGroups.GBPCountries;
		case 'us':
			return countryGroups.UnitedStates;
		case 'au':
			return countryGroups.AUDCountries;
		case 'eu':
			return countryGroups.EURCountries;
		case 'int':
			return countryGroups.International;
		case 'nz':
			return countryGroups.NZDCountries;
		case 'ca':
			return countryGroups.Canada;
	}
};
