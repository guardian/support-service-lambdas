import type { CountryCode } from '@modules/internationalisation/country';

export const contributionsOnlyCountries: CountryCode[] = [
	'AD', // Andorra
	'AF', // Afghanistan
	'AG', // Antigua & Barbuda
	'AI', // Anguilla
	'AL', // Albania
	'AM', // Armenia
	'AO', // Angola
	'AQ', // Antarctica
	'AR', // Argentina
	'AS', // American Samoa
	'AW', // Aruba
	'AX', // Åland Islands
	'AZ', // Azerbaijan
	'BA', // Bosnia-Herzegovina
	'BB', // Barbados
	'BD', // Bangladesh
	'BF', // Burkina Faso
	'BH', // Bahrain
	'BI', // Burundi
	'BJ', // Benin
	'BL', // Saint Barthélemy
	'BM', // Bermuda
	'BN', // Brunei Darussalam
	'BO', // Bolivia
	'BQ', // Bonaire, Saint Eustatius and Saba
	'BS', // Bahamas
	'BT', // Bhutan
	'BV', // Bouvet Island
	'BW', // Botswana
	'BY', // Belarus
	'BZ', // Belize
	'CC', // Cocos (Keeling) Islands
	'CD', // Congo (Kinshasa)
	'CF', // Central African Republic
	'CG', // Congo (Brazzaville)
	'CI', // Ivory Coast
	'CK', // Cook Islands
	'CL', // Chile
	'CM', // Cameroon
	'CN', // China
	'CO', // Colombia
	'CR', // Costa Rica
	'CU', // Cuba
	'CV', // Cabo Verde
	'CW', // Curaçao
	'CX', // Christmas Island
	'DJ', // Djibouti
	'DM', // Dominica
	'DO', // Dominican Republic
	'DZ', // Algeria
	'EC', // Ecuador
	'EG', // Egypt
	'EH', // Western Sahara
	'ER', // Eritrea
	'ET', // Ethiopia
	'FJ', // Fiji
	'FM', // Micronesia
	'FO', // Faroe Islands
	'GA', // Gabon
	'GD', // Grenada
	'GE', // Georgia
	'GF', // French Guiana
	'GH', // Ghana
	'GL', // Greenland
	'GM', // Gambia
	'GN', // Guinea
	'GP', // Guadeloupe
	'GQ', // Equatorial Guinea
	'GS', // South Georgia & The South Sandwich Islands
	'GT', // Guatemala
	'GU', // Guam
	'GW', // Guinea-Bissau
	'GY', // Guyana
	'HM', // Heard Island and McDonald Islands
	'HN', // Honduras
	'HT', // Haiti
	'ID', // Indonesia
	'IO', // British Indian Ocean Territory
	'IQ', // Iraq
	'IR', // Iran
	'JM', // Jamaica
	'JO', // Jordan
	'KE', // Kenya
	'KG', // Kyrgyzstan
	'KH', // Cambodia
	'KI', // Kiribati
	'KM', // Comoros
	'KN', // Saint Kitts and Nevis
	'KP', // North Korea
	'KR', // South Korea
	'KW', // Kuwait
	'KY', // Cayman Islands
	'KZ', // Kazakhstan
	'LA', // Laos
	'LB', // Lebanon
	'LC', // Saint Lucia
	'LI', // Liechtenstein
	'LK', // Sri Lanka
	'LR', // Liberia
	'LS', // Lesotho
	'LY', // Libya
	'MA', // Morocco
	'MC', // Monaco
	'MD', // Moldova
	'ME', // Montenegro
	'MF', // Saint Martin
	'MG', // Madagascar
	'MH', // Marshall Islands
	'MK', // North Macedonia
	'ML', // Mali
	'MM', // Myanmar
	'MN', // Mongolia
	'MO', // Macau
	'MP', // Northern Mariana Islands
	'MQ', // Martinique
	'MR', // Mauritania
	'MS', // Montserrat
	'MU', // Mauritius
	'MV', // Maldives
	'MW', // Malawi
	'MZ', // Mozambique
	'NA', // Namibia
	'NC', // New Caledonia
	'NE', // Niger
	'NF', // Norfolk Island
	'NG', // Nigeria
	'NI', // Nicaragua
	'NP', // Nepal
	'NR', // Nauru
	'NU', // Niue
	'OM', // Oman
	'PA', // Panama
	'PE', // Peru
	'PF', // French Polynesia
	'PG', // Papua New Guinea
	'PH', // Philippines
	'PK', // Pakistan
	'PM', // Saint Pierre & Miquelon
	'PN', // Pitcairn Islands
	'PR', // Puerto Rico
	'PW', // Palau
	'PY', // Paraguay
	'QA', // Qatar
	'RE', // Réunion
	'RS', // Serbia
	'RW', // Rwanda
	'SA', // Saudi Arabia
	'SB', // Solomon Islands
	'SC', // Seychelles
	'SD', // Sudan
	'SH', // Saint Helena
	'SJ', // Svalbard and Jan Mayen
	'SL', // Sierra Leone
	'SM', // San Marino
	'SN', // Senegal
	'SO', // Somalia
	'SR', // Suriname
	'SS', // South Sudan
	'ST', // Sao Tome & Principe
	'SV', // El Salvador
	'SX', // Sint Maarten
	'SY', // Syria
	'SZ', // Eswatini
	'TC', // Turks & Caicos Islands
	'TD', // Chad
	'TF', // French Southern Territories
	'TG', // Togo
	'TH', // Thailand
	'TJ', // Tajikistan
	'TK', // Tokelau
	'TL', // Timor-Leste
	'TM', // Turkmenistan
	'TN', // Tunisia
	'TO', // Tonga
	'TR', // Türkiye
	'TT', // Trinidad & Tobago
	'TV', // Tuvalu
	'TW', // Taiwan
	'TZ', // Tanzania
	'UA', // Ukraine
	'UG', // Uganda
	'UY', // Uruguay
	'UZ', // Uzbekistan
	'VA', // Vatican City
	'VC', // Saint Vincent & The Grenadines
	'VE', // Venezuela
	'VG', // British Virgin Islands
	'VN', // Vietnam
	'VU', // Vanuatu
	'WF', // Wallis & Futuna
	'WS', // Samoa
	'YE', // Yemen
	'YT', // Mayotte
	'ZM', // Zambia
	'ZW', // Zimbabwe
];

export const contributionsOnlyCountriesSet = new Set(
	contributionsOnlyCountries,
);
