//Used for dev testing since there is no dev sandbox for bigquery tables
export const CODEDataMockQueryResponse = [
	{
		//actual records from the Zuora dev sandbox. Update as needed.
		accountId: '8ad0823f83e3cf4a0183e5f23db449c3',
		invoiceId: '8ad085298634dd3801863a578eab3443',
		invoiceNumber: 'INV00340952',
		invoiceBalance: -24.82,
	},
	{
		//records that do not exist in Zuora dev sandbox. Used for error testing.
		accountId: '3c93a0ff5bec3ec3015c0ca913e7415b',
		invoiceId: '1c91a0ad795f6bcc017966151113650d',
		invoiceNumber: 'XXX',
		invoiceBalance: -2,
	},
];
