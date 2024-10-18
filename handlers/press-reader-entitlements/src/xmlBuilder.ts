import { XMLBuilder } from "fast-xml-parser";

type Product = {
	productID: string;
	startdate: string;
	enddate: string;
}

export type Member = {
	userID: string;
	firstname: string;
	lastname: string;
	products: Product[];
};

export function buildXml(member: Member){	
	const builder = new XMLBuilder({format: true});
	const xmlContent: string = builder.build(member);

	return `<?xml version="1.0" encoding="utf-8"?>\n${xmlContent}`;
}