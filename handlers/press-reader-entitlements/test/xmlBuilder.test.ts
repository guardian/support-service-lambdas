import type { Member } from '../src/xmlBuilder';
import { buildXml } from '../src/xmlBuilder';

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
