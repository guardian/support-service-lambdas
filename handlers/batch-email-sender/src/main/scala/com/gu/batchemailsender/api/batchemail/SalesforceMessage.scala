package com.gu.batchemailsender.api.batchemail

import play.api.libs.json._

/**
 * This is what gets sent from Salesforce directly. "Wire" indicates raw data sent over the wire. It seems the intention
 * was to treat Wire models as kind of DTO (Data Transfer Objects). This is NOT what gets put on the SQS. It is
 * converted to BrazeApiTriggerProperties
 *

{
	"batch_items": [{
		"payload": {
			"to_address": "mario.galic+bvtgedltoa@guardian.co.uk",
			"subscriber_id": "A-S00060454",
			"sf_contact_id": "0033E00001Chmk9QAB",
			"record_id": "5003E00000FyQBIQA3",
			"product": "Guardian Weekly",
			"next_charge_date": null,
			"modified_by_customer": null,
			"last_name": "bvtgedltoa",
			"identity_id": "200002073",
			"holiday_stop_request": null,
			"first_name": "bvtgedltoa",
			"email_stage": "Delivery issues",
			"digital_voucher": null,
			"delivery_problem": {
				"totalCreditAmount": "42.2",
				"repeatDeliveryProblem": "true",
				"issuesAffected": "3",
				"deliveries": [{
					"attributes": {
						"type": "Delivery__c",
						"url": "/services/data/v48.0/sobjects/Delivery__c/a3P3E000000VGvVUAW"
					},
					"Case__c": "5003E00000FyQBIQA3",
					"Id": "a3P3E000000VGvVUAW",
					"Name": "DR-00061459",
					"Delivery_Date__c": "2020-02-24",
					"Invoice_Date__c": "2020-06-20"
				}, {
					"attributes": {
						"type": "Delivery__c",
						"url": "/services/data/v48.0/sobjects/Delivery__c/a3P3E000000VGvWUAW"
					},
					"Case__c": "5003E00000FyQBIQA3",
					"Id": "a3P3E000000VGvWUAW",
					"Name": "DR-00061460",
					"Delivery_Date__c": "2020-02-24",
					"Invoice_Date__c": "2020-06-20"
				}]
			}
		},
		"object_name": "Case"
	}]
}

 */
object SalesforceMessage {

  // FIXME: What is this?
  case class SalesforceBatchWithExceptions(
    validBatch: SalesforceBatchItems,
    exceptions: List[Seq[(JsPath, Seq[JsonValidationError])]]
  )
  case class SalesforceBatchItems(batch_items: List[SalesforceBatchItem])
  case class SalesforceBatchItem(payload: SalesforcePayload, object_name: String)
  case class SalesforcePayload(
    record_id: String,
    to_address: String,
    subscriber_id: String,
    sf_contact_id: String,
    product: String,
    next_charge_date: Option[String],
    last_name: String,
    identity_id: Option[String],
    first_name: String,
    email_stage: String,
    modified_by_customer: Option[Boolean],
    holiday_stop_request: Option[WireHolidayStopRequest],
    digital_voucher: Option[WireDigitalVoucher],
    delivery_problem: Option[WireDeliveryProblem] = None,
    delivery_address_change: Option[WireDeliveryAddressChange] = None
  )

  case class WireHolidayStopRequest(
    holiday_start_date: String,
    holiday_end_date: String,
    stopped_credit_sum: String,
    currency_symbol: String,
    stopped_issue_count: String,
    stopped_credit_summaries: Option[List[WireHolidayStopCreditSummary]]
  )

  case class WireHolidayStopCreditSummary(credit_amount: Double, credit_date: String)

  case class WireDigitalVoucher(barcode_url: String)

  case class WireDeliveryProblem(
    actionTaken: String,
    totalCreditAmount: String,
    repeatDeliveryProblem: String,
    issuesAffected: String,
    deliveries: List[WireDelivery],
    typeOfProblem: String,
    currencySymbol: String,
    caseNumber: String
  )

  case class WireDelivery(
    Case__c: String,
    Name: String,
    Delivery_Date__c: String,
    Invoice_Date__c: Option[String]
  )

  case class WireDeliveryAddressChange(
    mailingStreet: Option[String], // line1,line2
    mailingCity: Option[String],
    mailingState: Option[String],
    mailingPostalCode: Option[String],
    mailingCountry: Option[String],
    addressChangeEffectiveDateBlurb: Option[String]
  )

  implicit val holidayStopCreditDetailReads = Json.reads[WireHolidayStopCreditSummary]
  implicit val holidayStopRequestReads = Json.reads[WireHolidayStopRequest]
  implicit val digitalVoucherReads = Json.reads[WireDigitalVoucher]
  implicit val delivery = Json.reads[WireDelivery]
  implicit val deliveryProblemReads = Json.reads[WireDeliveryProblem]
  implicit val deliveryAddressChangeReads = Json.reads[WireDeliveryAddressChange]
  implicit val emailBatchItemPayloadReads = Json.reads[SalesforcePayload]
  implicit val emailBatchItemReads = Json.reads[SalesforceBatchItem]
  implicit val emailBatch = Json.reads[SalesforceBatchItems]

  implicit val emailBatchWithExceptions: Reads[SalesforceBatchWithExceptions] = json => {
    val validated = (json \ "batch_items").as[List[JsObject]] map { itemOrException =>
      itemOrException.validate[SalesforceBatchItem]
    }
    JsSuccess(
      SalesforceBatchWithExceptions(
        validBatch = SalesforceBatchItems(validated collect { case JsSuccess(item, _) => item }),
        exceptions = validated collect { case JsError(e) => e }
      )
    )
  }
}

