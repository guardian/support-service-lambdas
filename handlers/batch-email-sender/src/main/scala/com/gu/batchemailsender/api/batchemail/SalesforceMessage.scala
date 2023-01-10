package com.gu.batchemailsender.api.batchemail

import play.api.libs.json._

/** This is what gets sent from Salesforce directly. "Wire" indicates raw data sent over the wire. It seems the
  * intention was to treat Wire models as kind of DTO (Data Transfer Objects). This is NOT what gets put on the SQS. It
  * is converted to BrazeApiTriggerProperties
  */
object SalesforceMessage {

  // FIXME: What is this?
  case class SalesforceBatchWithExceptions(
      validBatch: SalesforceBatchItems,
      exceptions: List[
        collection.Seq[(JsPath, collection.Seq[JsonValidationError])],
      ], // this is supposed to correspond to play's JsError which uses collection.Seq
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
      last_name: Option[String],
      identity_id: Option[String],
      first_name: Option[String],
      email_stage: String,
      modified_by_customer: Option[Boolean],
      holiday_stop_request: Option[WireHolidayStopRequest],
      digital_voucher: Option[WireDigitalVoucher],
      delivery_problem: Option[WireDeliveryProblem] = None,
      delivery_address_change: Option[WireDeliveryAddressChange] = None,
  )

  case class WireHolidayStopRequest(
      holiday_start_date: String,
      holiday_end_date: String,
      stopped_credit_sum: String,
      currency_symbol: String,
      stopped_issue_count: String,
      stopped_credit_summaries: Option[List[WireHolidayStopCreditSummary]],
      bulk_suspension_reason: Option[String],
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
      caseNumber: String,
  )

  case class WireDelivery(
      Case__c: String,
      Name: String,
      Delivery_Date__c: String,
      Invoice_Date__c: Option[String],
  )

  case class WireDeliveryAddressChange(
      mailingStreet: Option[String], // line1,line2
      mailingCity: Option[String],
      mailingState: Option[String],
      mailingPostalCode: Option[String],
      mailingCountry: Option[String],
      addressChangeEffectiveDateBlurb: Option[String],
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
        exceptions = validated collect { case JsError(e) => e },
      ),
    )
  }
}
