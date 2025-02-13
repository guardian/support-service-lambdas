import { XMLBuilder } from 'fast-xml-parser';

type Product = {
	product: {
		productID: string;
		startdate: string;
		enddate: string;
	};
};

export type Member = {
	userID: string;
	products: Product[];
};

export function buildXml(member: Member) {
	const builder = new XMLBuilder({ format: true, oneListGroup: true });
	/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- fast-xml-parser returns any when it should be string */
	const xmlContent = builder.build(member);

	return `<?xml version="1.0" encoding="utf-8"?>\n${xmlContent}`;
}
