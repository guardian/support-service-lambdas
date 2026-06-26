import z from 'zod';

export const usStateCodes = [
	'AL',
	'AK',
	'AZ',
	'AR',
	'AE',
	'AA',
	'AP',
	'CA',
	'CO',
	'CT',
	'DE',
	'FL',
	'GA',
	'GU',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'PR',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VI',
	'VA',
	'WA',
	'DC',
	'WV',
	'WI',
	'WY',
] as const;

export type UsStateCode = (typeof usStateCodes)[number];

export const usStates: Record<UsStateCode, string> = {
	AL: 'Alabama',
	AK: 'Alaska',
	AZ: 'Arizona',
	AR: 'Arkansas',
	AE: 'Armed Forces',
	AA: 'Armed Forces America',
	AP: 'Armed Forces Pacific',
	CA: 'California',
	CO: 'Colorado',
	CT: 'Connecticut',
	DE: 'Delaware',
	FL: 'Florida',
	GA: 'Georgia',
	GU: 'Guam',
	HI: 'Hawaii',
	ID: 'Idaho',
	IL: 'Illinois',
	IN: 'Indiana',
	IA: 'Iowa',
	KS: 'Kansas',
	KY: 'Kentucky',
	LA: 'Louisiana',
	ME: 'Maine',
	MD: 'Maryland',
	MA: 'Massachusetts',
	MI: 'Michigan',
	MN: 'Minnesota',
	MS: 'Mississippi',
	MO: 'Missouri',
	MT: 'Montana',
	NE: 'Nebraska',
	NV: 'Nevada',
	NH: 'New Hampshire',
	NJ: 'New Jersey',
	NM: 'New Mexico',
	NY: 'New York',
	NC: 'North Carolina',
	ND: 'North Dakota',
	OH: 'Ohio',
	OK: 'Oklahoma',
	OR: 'Oregon',
	PA: 'Pennsylvania',
	PR: 'Puerto Rico',
	RI: 'Rhode Island',
	SC: 'South Carolina',
	SD: 'South Dakota',
	TN: 'Tennessee',
	TX: 'Texas',
	UT: 'Utah',
	VT: 'Vermont',
	VI: 'Virgin Islands',
	VA: 'Virginia',
	WA: 'Washington',
	DC: 'Washington DC (District of Columbia)',
	WV: 'West Virginia',
	WI: 'Wisconsin',
	WY: 'Wyoming',
};

export const usStateCodeSchema = z.enum(usStateCodes);
export const usStateSchema = z.record(usStateCodeSchema, z.string());
export type UsState = z.infer<typeof usStateSchema>;

export const caStateCodes = [
	'AB',
	'BC',
	'MB',
	'NB',
	'NL',
	'NT',
	'NS',
	'NU',
	'ON',
	'PE',
	'QC',
	'SK',
	'YT',
] as const;

export type CaStateCode = (typeof caStateCodes)[number];

export const caStates: Record<CaStateCode, string> = {
	AB: 'Alberta',
	BC: 'British Columbia',
	MB: 'Manitoba',
	NB: 'New Brunswick',
	NL: 'Newfoundland and Labrador',
	NT: 'Northwest Territories',
	NS: 'Nova Scotia',
	NU: 'Nunavut',
	ON: 'Ontario',
	PE: 'Prince Edward Island',
	QC: 'Quebec',
	SK: 'Saskatchewan',
	YT: 'Yukon',
};

export const caStateCodeSchema = z.enum(caStateCodes);
export const caStateSchema = z.record(caStateCodeSchema, z.string());
export type CaState = z.infer<typeof caStateSchema>;

export const auStateCodes = [
	'ACT',
	'NSW',
	'NT',
	'QLD',
	'SA',
	'TAS',
	'VIC',
	'WA',
] as const;

export type AuStateCode = (typeof auStateCodes)[number];

export const auStates: Record<AuStateCode, string> = {
	ACT: 'Australian Capital Territory',
	NSW: 'New South Wales',
	NT: 'Northern Territory',
	QLD: 'Queensland',
	SA: 'South Australia',
	TAS: 'Tasmania',
	VIC: 'Victoria',
	WA: 'Western Australia',
};

export const auStateCodeSchema = z.enum(auStateCodes);
export const auStateSchema = z.record(auStateCodeSchema, z.string());
export type AuState = z.infer<typeof auStateSchema>;

export const stateOrProvinceCodeSchema = z.union([
	usStateCodeSchema,
	caStateCodeSchema,
	auStateCodeSchema,
]);
export const stateOrProvinceSchema = z.union([
	usStateSchema,
	caStateSchema,
	auStateSchema,
]);
