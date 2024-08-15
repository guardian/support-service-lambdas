/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 *
 * This specific test is a placeholder and will be updated at a later date when the project has matured such that there is something to test.
 * The test is retained here simply to prevent the build from failing
 */
test('my app', () => {
	// {
	// 	"object": "order",
	// 	"id": "or_737352",
	// 	"buyer_details": {
	// 	  "address": {
	// 		"address_1": "The Queen's Walk",
	// 		"address_2": "Bishop's",
	// 		"address_3": "London",
	// 		"postal_code": "SE1 7PB"
	// 	  },
	// 	  "custom_questions": [],
	// 	  "email": "john@example.com",
	// 	  "first_name": "John",
	// 	  "last_name": "Doe",
	// 	  "name": "John Doe",
	// 	  "phone": "07123456789"
	// 	},
	// 	"created_at": 1587042691,
	// 	"currency": {
	// 	  "base_multiplier": 100,
	// 	  "code": "gbp"
	// 	},
	// 	"event_summary": {
	// 	  "id": "ev_40980",
	// 	  "event_id": "ev_40980",
	// 	  "event_series_id": "es_50897",
	// 	  "end_date": {
	// 		"date": "2020-05-01",
	// 		"formatted": "Fri 1 May 2020 10:30 PM",
	// 		"iso": "2020-05-01T22:30:00+01:00",
	// 		"time": "22:30",
	// 		"timezone": "+01:00",
	// 		"unix": 1588368600
	// 	  },
	// 	  "name": "Hackney Downs 2020 Tulip Festival",
	// 	  "start_date": {
	// 		"date": "2020-05-01",
	// 		"formatted": "Fri 1 May 2020 6:00 PM",
	// 		"iso": "2020-05-01T18:00:00+01:00",
	// 		"time": "18:00",
	// 		"timezone": "+01:00",
	// 		"unix": 1588352400
	// 	  },
	// 	  "venue": {
	// 		"name": "Royal Albert Hall",
	// 		"postal_code": "SW7 2AP"
	// 	  }
	// 	},
	// 	"issued_tickets": [
	// 	  {
	// 		"object": "issued_ticket",
	// 		"id": "it_50198",
	// 		"barcode": "al4R5",
	// 		"barcode_url": "https://www.tickettailor.com/userfiles/cache/barcode/qr/attendee/50198/42bf63ef2a055b91a62f",
	// 		"checked_in": "false",
	// 		"created_at": 1587042697,
	// 		"custom_questions": [],
	// 		"description": "Free ticket",
	// 		"email": "john@example.com",
	// 		"event_id": "ev_40980",
	// 		"reference": "my reference code",
	// 		"full_name": null,
	// 		"first_name": null,
	// 		"group_ticket_barcode": null,
	// 		"last_name": null,
	// 		"status": "valid",
	// 		"source": "api",
	// 		"ticket_type_id": "tt_230656",
	// 		"updated_at": 1587042697,
	// 		"voided_at": null,
	// 		"order_id": "or_737352",
	// 		"qr_code_url": "https://www.tickettailor.com/userfiles/cache/barcode/st/attendee/50198/42bf63ef2a055b91a62f"
	// 	  },
	// 	  {
	// 		"object": "issued_ticket",
	// 		"id": "it_50199",
	// 		"barcode": "dx2Fv",
	// 		"barcode_url": "https://www.tickettailor.com/userfiles/cache/barcode/qr/attendee/50199/633d33a7ff6eba30a565",
	// 		"checked_in": "false",
	// 		"created_at": 1587042697,
	// 		"custom_questions": [],
	// 		"description": "Free ticket",
	// 		"email": "john@example.com",
	// 		"event_id": "ev_40980",
	// 		"reference": "my reference code",
	// 		"full_name": null,
	// 		"first_name": null,
	// 		"group_ticket_barcode": null,
	// 		"last_name": null,
	// 		"status": "valid",
	// 		"source": "api",
	// 		"ticket_type_id": "tt_230656",
	// 		"updated_at": 1587042697,
	// 		"voided_at": null,
	// 		"order_id": "or_737352",
	// 		"qr_code_url": "https://www.tickettailor.com/userfiles/cache/barcode/st/attendee/50199/633d33a7ff6eba30a565"
	// 	  }
	// 	],
	// 	"line_items": [
	// 	  {
	// 		"object": "line_item",
	// 		"id": "li_1505167",
	// 		"booking_fee": 0,
	// 		"description": "Free ticket",
	// 		"type": "ticket",
	// 		"total": 0,
	// 		"value": 0,
	// 		"quantity": 2,
	// 		"item_id": "tt_230656"
	// 	  }
	// 	],
	// 	"meta_data": [],
	// 	"marketing_opt_in": null,
	// 	"payment_method": {
	// 	  "external_id": "seller222@example.com",
	// 	  "id": "pm_6691",
	// 	  "instructions": null,
	// 	  "name": null,
	// 	  "type": "paypal"
	// 	},
	// 	"referral_tag": "website",
	// 	"refund_amount": 0,
	// 	"refunded_voucher_id": null,
	// 	"status": "completed",
	// 	"status_message": null,
	// 	"subtotal": 0,
	// 	"tax": 0,
	// 	"tax_treatment": "exclusive",
	// 	"total": 0,
	// 	"txn_id": "ABCD1234"
	//   }
	expect(1 + 1).toEqual(2);
});
