import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import codeZuoraCatalog from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { checkForValidEntitlements } from '../src';
import type { SupporterRatePlanItem } from '../src/dynamo';
import type { Member } from '../src/xmlBuilder';
import { buildXml } from '../src/xmlBuilder';

describe('xmlBuilder', () => {
	test('creates Member schema xml', () => {
		const expectedXml = `<?xml version="1.0" encoding="utf-8"?>
<userID>123456</userID>
<firstname>John</firstname>
<lastname>Doe</lastname>
<products>
  <productID>123</productID>
  <startdate>2022-01-01</startdate>
  <enddate>2022-12-31</enddate>
</products>
<products>
  <productID>456</productID>
  <startdate>2022-01-01</startdate>
  <enddate>2022-12-31</enddate>
</products>
`;

		const member: Member = {
			userID: '123456',
			firstname: 'John',
			lastname: 'Doe',
			products: [
				{
					productID: '123',
					startdate: '2022-01-01',
					enddate: '2022-12-31',
				},
				{
					productID: '456',
					startdate: '2022-01-01',
					enddate: '2022-12-31',
				},
			],
		};

		const result = buildXml(member);

		expect(result).toEqual(expectedXml);
	});
});

const codeProductCatalog = generateProductCatalog(codeZuoraCatalog);

test('checkForValidEntitlements', () => {
	const supporterData: SupporterRatePlanItem[] = [
		{
			subscriptionName: 'A-S00123456',
			contractEffectiveDate: '2024-02-01',
			termEndDate: '2025-02-01',
			identityId: '110001234',
			productRatePlanId: '2c92c0f878ac40300178acaa04bb401d',
			productRatePlanName: 'GW Oct 18 - Monthly - Domestic',
		},
	];

	const isEntitled = checkForValidEntitlements(
		codeProductCatalog,
		supporterData,
	);

	expect(isEntitled).toEqual(true);
});
