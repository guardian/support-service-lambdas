import { XMLBuilder } from 'fast-xml-parser';

type Product = {
	product: {
		productID: string;
		startdate: string;
		enddate: string;
	};
};

export type Member = {
	member: {
		userID: string;
		products: Product[];
	};
};

export function buildXml(member: Member) {
	const builder = new XMLBuilder({ format: true, oneListGroup: true });
	const xmlContent = builder.build(member);

	return `<?xml version="1.0" encoding="utf-8"?>\n${xmlContent}`;
}
