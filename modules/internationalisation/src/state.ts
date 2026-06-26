import z from 'zod';

export const usIsoStates = [
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

export type UsIsoState = (typeof usIsoStates)[number];

export const usStates: Record<UsIsoState, string> = {
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

export const usIsoStateSchema = z.enum(usIsoStates);
export const usStateSchema = z.record(usIsoStateSchema, z.string());
export type UsState = z.infer<typeof usStateSchema>;

export const caIsoStates = [
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

export type CaIsoState = (typeof caIsoStates)[number];

export const caStates: Record<CaIsoState, string> = {
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

export const caIsoStateSchema = z.enum(caIsoStates);
export const caStateSchema = z.record(caIsoStateSchema, z.string());
export type CaState = z.infer<typeof caStateSchema>;

export const auIsoStates = [
	'ACT',
	'NSW',
	'NT',
	'QLD',
	'SA',
	'TAS',
	'VIC',
	'WA',
] as const;

export type AuIsoState = (typeof auIsoStates)[number];

export const auStates: Record<AuIsoState, string> = {
	ACT: 'Australian Capital Territory',
	NSW: 'New South Wales',
	NT: 'Northern Territory',
	QLD: 'Queensland',
	SA: 'South Australia',
	TAS: 'Tasmania',
	VIC: 'Victoria',
	WA: 'Western Australia',
};

export const auIsoStateSchema = z.enum(auIsoStates);
export const auStateSchema = z.record(auIsoStateSchema, z.string());
export type AuState = z.infer<typeof auStateSchema>;

export const isoStateSchema = z.union([
	usIsoStateSchema,
	caIsoStateSchema,
	auIsoStateSchema,
]);
export const stateOrProvinceSchema = z.union([
	usStateSchema,
	caStateSchema,
	auStateSchema,
]);
