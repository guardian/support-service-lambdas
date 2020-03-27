package com.gu.batchemailsender.api.batchemail

import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

/**
 * This is what gets sent from Salesforce directly. "Wire" indicates raw data sent over the wire. It seems the intention
 * was to treat Wire models as kind of DTO (Data Transfer Objects). This is NOT what gets put on the SQS. It is
 * converted to BrazeApiTriggerProperties
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

object SalesforceToBrazeTransformations {
  def fromSfDateToDisplayDate(sfDate: String): String = {
    val formattedDate: Try[String] = Try {
      val asDateTime = DateTime.parse(sfDate, DateTimeFormat.forPattern("yyyy-MM-dd"))
      asDateTime.toString(DateTimeFormat.forPattern("d MMMM yyyy"))
    }

    formattedDate match {
      case Success(date) => date
      case Failure(_) => sfDate
    }
  }

  /**
   * Salesforce mailingStreet field concatenates on a single line (line1,line), whilst MMA has it over two separate lines
   */
  private val sfStreetPattern = """([^,]+),(.*)""".r

  def sfStreetToLine1(in: String): Option[String] =
    in match {
      case sfStreetPattern(line1, _) if line1.nonEmpty => Some(line1)
      case _ => None
    }

  def sfStreetToLine2(in: String): Option[String] =
    in match {
      case sfStreetPattern(_, line2) if line2.nonEmpty => Some(line2)
      case _ => None
    }
}
