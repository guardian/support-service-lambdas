package com.gu.batchemailsender.api.batchemail.model

import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.libs.json._

import scala.util.{Failure, Success, Try}

object EmailBatch {

  object WireModel {

    case class WireEmailBatchWithExceptions(
      validBatch: WireEmailBatch,
      exceptions: List[Seq[(JsPath, Seq[JsonValidationError])]]
    )
    case class WireEmailBatch(batch_items: List[WireEmailBatchItem])
    case class WireEmailBatchItem(payload: WireEmailBatchItemPayload, object_name: String)
    case class WireEmailBatchItemPayload(
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
      digital_voucher: Option[WireDigitalVoucher]
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
    case class WireDigitalVoucher(card_url: String)

    implicit val holidayStopCreditDetailReads = Json.reads[WireHolidayStopCreditSummary]
    implicit val holidayStopRequestReads = Json.reads[WireHolidayStopRequest]
    implicit val digitalVoucherReads = Json.reads[WireDigitalVoucher]
    implicit val emailBatchItemPayloadReads = Json.reads[WireEmailBatchItemPayload]
    implicit val emailBatchItemReads = Json.reads[WireEmailBatchItem]
    implicit val emailBatch = Json.reads[WireEmailBatch]

    implicit val emailBatchWithExceptions: Reads[WireEmailBatchWithExceptions] = json => {
      val validated = (json \ "batch_items").as[List[JsObject]] map { itemOrException =>
        itemOrException.validate[WireEmailBatchItem]
      }
      JsSuccess(
        WireEmailBatchWithExceptions(
          validBatch = WireEmailBatch(validated collect { case JsSuccess(item, _) => item }),
          exceptions = validated collect { case JsError(e) => e }
        )
      )
    }

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

    def fromWire(wireEmailBatch: WireEmailBatch): EmailBatch = {
      val items = wireEmailBatch.batch_items.map(fromWire(_))
      EmailBatch(
        emailBatchItems = items
      )
    }

    private def fromWire(wireEmailBatchItem: WireEmailBatchItem): EmailBatchItem = {
      val emailBatchPayload = wireEmailBatchItem.payload

      EmailBatchItem(
        payload = EmailBatchItemPayload(
          record_id = EmailBatchItemId(emailBatchPayload.record_id),
          to_address = emailBatchPayload.to_address,
          subscriber_id = SubscriberId(emailBatchPayload.subscriber_id),
          sf_contact_id = SfContactId(emailBatchPayload.sf_contact_id),
          product = emailBatchPayload.product,
          next_charge_date = emailBatchPayload.next_charge_date.map(fromSfDateToDisplayDate),
          last_name = emailBatchPayload.last_name,
          identity_id = emailBatchPayload.identity_id.map(IdentityUserId),
          first_name = emailBatchPayload.first_name,
          email_stage = emailBatchPayload.email_stage,
          modified_by_customer = emailBatchPayload.modified_by_customer,
          holiday_start_date = emailBatchPayload.holiday_stop_request.map(stop =>
            HolidayStartDate(fromSfDateToDisplayDate(stop.holiday_start_date))),
          holiday_end_date = emailBatchPayload.holiday_stop_request.map(stop =>
            HolidayEndDate(fromSfDateToDisplayDate(stop.holiday_end_date))),
          stopped_credit_sum = emailBatchPayload.holiday_stop_request.map(stop =>
            StoppedCreditSum(stop.stopped_credit_sum)),
          currency_symbol = emailBatchPayload.holiday_stop_request.map(stop =>
            CurrencySymbol(stop.currency_symbol)),
          stopped_issue_count = emailBatchPayload.holiday_stop_request.map(stop =>
            StoppedIssueCount(stop.stopped_issue_count)),
          stopped_credit_summaries =
            for {
              stop <- emailBatchPayload.holiday_stop_request
              summaryList <- stop.stopped_credit_summaries
              stoppedCreditSummaries = summaryList.map { detail =>
                StoppedCreditSummary(
                  StoppedCreditSummaryAmount(detail.credit_amount),
                  StoppedCreditSummaryDate(fromSfDateToDisplayDate(detail.credit_date))
                )
              }
            } yield stoppedCreditSummaries,
          digital_voucher = wireEmailBatchItem
            .payload
            .digital_voucher
            .map(wireVoucher => DigitalVoucher(DigitalVoucherUrl(wireVoucher.card_url)))
        ),
        object_name = wireEmailBatchItem.object_name
      )
    }

  }

}

case class SubscriberId(value: String) extends AnyVal
case class SfContactId(value: String) extends AnyVal
case class IdentityUserId(value: String) extends AnyVal
case class EmailBatchItemId(value: String) extends AnyVal
case class HolidayStartDate(value: String) extends AnyVal
case class HolidayEndDate(value: String) extends AnyVal
case class StoppedCreditSum(value: String) extends AnyVal
case class CurrencySymbol(value: String) extends AnyVal
case class StoppedIssueCount(value: String) extends AnyVal
case class StoppedCreditSummary(credit_amount: StoppedCreditSummaryAmount, credit_date: StoppedCreditSummaryDate)
case class StoppedCreditSummaryAmount(value: Double) extends AnyVal
case class StoppedCreditSummaryDate(value: String) extends AnyVal
case class DigitalVoucherUrl(value: String) extends AnyVal
case class DigitalVoucher(cardUrl: DigitalVoucherUrl)

case class EmailBatchItemPayload(
  record_id: EmailBatchItemId,
  to_address: String,
  subscriber_id: SubscriberId,
  sf_contact_id: SfContactId,
  product: String,
  next_charge_date: Option[String],
  last_name: String,
  identity_id: Option[IdentityUserId],
  first_name: String,
  email_stage: String,
  modified_by_customer: Option[Boolean],
  holiday_start_date: Option[HolidayStartDate],
  holiday_end_date: Option[HolidayEndDate],
  stopped_credit_sum: Option[StoppedCreditSum],
  currency_symbol: Option[CurrencySymbol],
  stopped_issue_count: Option[StoppedIssueCount],
  stopped_credit_summaries: Option[List[StoppedCreditSummary]],
  digital_voucher: Option[DigitalVoucher]
)

case class EmailBatchItem(payload: EmailBatchItemPayload, object_name: String)
case class EmailBatch(emailBatchItems: List[EmailBatchItem])
