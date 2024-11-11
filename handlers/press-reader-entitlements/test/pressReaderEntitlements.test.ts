import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import codeZuoraCatalog from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { getLatestValidSubscription } from '../src';
import type { SupporterRatePlanItem } from '../src/dynamo';
import type { Member } from '../src/xmlBuilder';
import { buildXml } from '../src/xmlBuilder';

describe('xmlBuilder', () => {
	it('creates Member schema xml with products', () => {
		const expectedXml = `<?xml version="1.0" encoding="utf-8"?>
<userID>123456</userID>
<products>
  <product>
    <productID>123</productID>
    <startdate>2022-01-01</startdate>
    <enddate>2022-12-31</enddate>
  </product>
  <product>
    <productID>456</productID>
    <startdate>2022-01-01</startdate>
    <enddate>2022-12-31</enddate>
  </product>
</products>
`;

		const member: Member = {
			userID: '123456',
			products: [
				{
					product: {
						productID: '123',
						startdate: '2022-01-01',
						enddate: '2022-12-31',
					},
				},
				{
					product: {
						productID: '456',
						startdate: '2022-01-01',
						enddate: '2022-12-31',
					},
				},
			],
		};

		const result = buildXml(member);

		expect(result).toEqual(expectedXml);
	});

	it('creates creates Member schema xml with no products', () => {
		const expectedXml = `<?xml version="1.0" encoding="utf-8"?>
<userID>123456</userID>
<products></products>
`;

		const member: Member = {
			userID: '123456',
			products: [],
		};

		const result = buildXml(member);

		expect(result).toEqual(expectedXml);
	});
});

const codeProductCatalog = generateProductCatalog(codeZuoraCatalog);

describe('getLatestValidSubscription', () => {
	it('gets latest subscription by term end date', () => {
		const supporterData: SupporterRatePlanItem[] = [
			{
				subscriptionName: 'A-S00123456',
				contractEffectiveDate: '2024-01-01',
				termEndDate: '2024-01-31',
				identityId: '110001234',
				productRatePlanId: 'Invalid Product Rate Plan ID',
				productRatePlanName: 'Fake Product',
			},
			{
				subscriptionName: 'A-S00123456',
				contractEffectiveDate: '2024-02-01',
				termEndDate: '2025-01-01',
				identityId: '110001234',
				productRatePlanId: '8ad096ca8992481d018992a363bd17ad',
				productRatePlanName: 'NationalDelivery',
			},
			{
				subscriptionName: 'A-S00123456',
				contractEffectiveDate: '2024-02-01',
				termEndDate: '2025-02-01',
				identityId: '110001234',
				productRatePlanId: '8ad08cbd8586721c01858804e3275376',
				productRatePlanName: 'SupporterPlus',
			},
		];

		const subscription = getLatestValidSubscription(
			codeProductCatalog,
			supporterData,
		);

		expect(subscription).toBeDefined();
		expect(subscription?.termEndDate).toBe('2025-02-01');
		expect(subscription?.productRatePlanName).toBe('SupporterPlus');
	});
});
