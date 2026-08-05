/** One row of the work list, as the BigQuery query returns it. */
export type PaymentMethodToScrub = {
	payment_method_id: string;
	account_id: string;
	account_number: string;
};
