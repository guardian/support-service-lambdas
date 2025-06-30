//Used for dev testing since there is no dev sandbox for bigquery tables
export const CODEDataMockQueryResponse = [
	{
		//actual records from the Zuora dev sandbox. Update as needed.
		accountId: '8ad08aef83d5d6330183d6b24bd46138',
		invoiceId: '8ad085298634dd3801863a16a1cd3024',
		invoiceNumber: 'INV00316069',
		invoiceBalance: -30.0,
	},
	{
		//records that do not exist in Zuora dev sandbox. Used for error testing.
		accountId: '3c93a0ff5bec3ec3015c0ca913e7415b',
		invoiceId: '1c91a0ad795f6bcc017966151113650d',
		invoiceNumber: 'XXX',
		invoiceBalance: -2,
	},
];
