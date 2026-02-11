import type { ImovoVoucherResponse, VoucherRecord } from './schemas';

export interface VoucherProvider {
	requestVoucher(voucherType: string): Promise<ImovoVoucherResponse>;
}

export interface VoucherRepository {
	save(record: VoucherRecord): Promise<void>;
}
