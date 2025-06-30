//Used for dev testing since there is no dev sandbox for bigquery tables
export const CODEDataMockQueryResponse = [
	{
		//actual records from the Zuora dev sandbox. Update as needed.
		accountId: '8ad081c6863a873401863b8bacce51d8',
		invoiceId: '8ad0880588dd84360188e17b4929743b',
		invoiceNumber: 'INV00820612',
		invoiceBalance: -6.33,
	},
	{
		//records that do not exist in Zuora dev sandbox. Used for error testing.
		accountId: '3c93a0ff5bec3ec3015c0ca913e7415b',
		invoiceId: '1c91a0ad795f6bcc017966151113650d',
		invoiceNumber: 'XXX',
		invoiceBalance: -2,
	},
];
