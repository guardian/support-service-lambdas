package com.gu.batchemailsender.api.batchemail

import ai.x.play.json.Jsonx
import SalesforceMessage.SalesforceBatchItem
import SalesforceToBrazeTransformations._
import ai.x.play.json.Encoders._

/** This is what actually gets sent to SQS and the fields correspond to Braze api_trigger_properties. For example,
  * stopped_credit_summaries can be found in SV_HolidayStopConfirmation_GuardianWeeklyBodyCopy Braze content block.
  *
  * FIXME: For some reason this has to have flat structure?
  */
case class BrazeApiTriggerProperties(
    first_name: String,
    last_name: String,
    subscriber_id: String,
    next_charge_date: Option[String],
    product: String,
    modified_by_customer: Option[Boolean],

    /** SV_HolidayStopConfirmation, SV_HolidayStopAmend, SV_HolidayStopWithdrawal
      */
    holiday_start_date: Option[String],
    holiday_end_date: Option[String],
    stopped_credit_sum: Option[String],
    currency_symbol: Option[String],
    stopped_issue_count: Option[String],
    stopped_credit_summaries: Option[List[StoppedCreditSummary]],
    bulk_suspension_reason: Option[String],

    /** SV_SC_BarcodeAccess_Day0_plus_15, SV_SC_LostItem
      */
    digital_voucher: Option[DigitalVoucher],

    /*
     * Delivery Problem fields
     * Braze campaign: SV_DeliveryProblemConfirmation
     * Braze content block: SV_HolidayStopConfirmation_GuardianWeeklyBodyCopy
     */
    delivery_problem_action: Option[String] = None, // Credit or Escalation
    delivery_problem_total_affected: Option[String] = None,
    delivery_problem_affected_dates: Option[String] = None,
    delivery_problem_total_credit: Option[String] = None,
    delivery_problem_invoice_date: Option[String] = None, // Invoice_Date__c Is it the same for multiple issues ?
    delivery_problem_type: Option[String] = None, // No delivery | Damaged paper,
    delivery_problem_currency_symbol: Option[String] = None,
    delivery_problem_case_number: Option[String] = None,

    /*
     * SV_DeliveryAddressChangeConfirmation
     * https://manage.theguardian.com/delivery/guardianweekly/address/confirmed
     */
    delivery_address_change_line1: Option[String] = None,
    delivery_address_change_line2: Option[String] = None,
    delivery_address_change_city: Option[String] = None,
    delivery_address_change_state: Option[String] = None,
    delivery_address_change_postcode: Option[String] = None,
    delivery_address_change_country: Option[String] = None,
    delivery_address_change_effective_date_blurb: Option[String] = None,
)

case class StoppedCreditSummary(credit_amount: Double, credit_date: String)
case class DigitalVoucher(barcode_url: String)
case class EmailPayloadContactAttributes(SubscriberAttributes: BrazeApiTriggerProperties)
case class EmailPayloadTo(Address: String, SubscriberKey: String, ContactAttributes: EmailPayloadContactAttributes)

// Message put on the SQS contributions-thanks queue for pickup by membership-workflow
case class BrazeSqsMessage(
    To: EmailPayloadTo,
    DataExtensionName: String,
    SfContactId: Option[String],
    IdentityUserId: Option[String],
    recordId: String,
)

object BrazeSqsMessage {
  implicit val stoppedCreditSummaryFormat = Jsonx.formatCaseClass[StoppedCreditSummary]
  implicit val digitalVoucherFormat = Jsonx.formatCaseClass[DigitalVoucher]
  implicit val emailPayloadSubscriberAttributesWriter = Jsonx.formatCaseClass[BrazeApiTriggerProperties]
  implicit val emailPayloadContactAttributesWriter = Jsonx.formatCaseClass[EmailPayloadContactAttributes]
  implicit val emailPayloadToWriter = Jsonx.formatCaseClass[EmailPayloadTo]
  implicit val emailToSendWriter = Jsonx.formatCaseClass[BrazeSqsMessage]

  def fromSalesforceMessage(salesforceBatchItem: SalesforceBatchItem): BrazeSqsMessage = {
    val salesforcePayload = salesforceBatchItem.payload

    val emailPayloadTo = EmailPayloadTo(
      Address = salesforceBatchItem.payload.to_address,
      SubscriberKey = salesforceBatchItem.payload.to_address,

      // Actual Braze fields
      ContactAttributes = EmailPayloadContactAttributes(
        SubscriberAttributes = BrazeApiTriggerProperties(
          atLeastSupporter(salesforceBatchItem.payload.first_name),
          atLeastEmptyString(salesforceBatchItem.payload.last_name),
          salesforceBatchItem.payload.subscriber_id,
          salesforceBatchItem.payload.next_charge_date.map(fromSfDateToDisplayDate),
          salesforceBatchItem.payload.product,
          salesforceBatchItem.payload.modified_by_customer,

          // Holiday stop
          salesforcePayload.holiday_stop_request.map(stop => fromSfDateToDisplayDate(stop.holiday_start_date)),
          salesforcePayload.holiday_stop_request.map(stop => fromSfDateToDisplayDate(stop.holiday_end_date)),
          salesforcePayload.holiday_stop_request.map(_.stopped_credit_sum),
          salesforcePayload.holiday_stop_request.map(_.currency_symbol),
          salesforcePayload.holiday_stop_request.map(_.stopped_issue_count),
          stopped_credit_summaries = for {
            stop <- salesforcePayload.holiday_stop_request
            summaryList <- stop.stopped_credit_summaries
            stoppedCreditSummaries = summaryList.map(detail =>
              StoppedCreditSummary(detail.credit_amount, fromSfDateToDisplayDate(detail.credit_date)),
            )
          } yield stoppedCreditSummaries,
          salesforcePayload.holiday_stop_request.flatMap(_.bulk_suspension_reason),

          // Digital voucher
          digital_voucher = salesforceBatchItem.payload.digital_voucher
            .map(wireVoucher => DigitalVoucher(wireVoucher.barcode_url)),

          // Delivery Problem
          delivery_problem_action = salesforcePayload.delivery_problem.map(_.actionTaken),
          delivery_problem_total_affected = salesforcePayload.delivery_problem.map(_.issuesAffected),
          delivery_problem_affected_dates = salesforcePayload.delivery_problem.map(
            _.deliveries.map(d => fromSfDateToDisplayDate(d.Delivery_Date__c)).mkString(", "),
          ),
          delivery_problem_total_credit = salesforcePayload.delivery_problem.map(_.totalCreditAmount),
          delivery_problem_invoice_date = salesforcePayload.delivery_problem.flatMap(
            _.deliveries.flatMap(_.Invoice_Date__c).headOption.map(fromSfDateToDisplayDate),
          ),
          delivery_problem_type = salesforcePayload.delivery_problem.map(_.typeOfProblem),
          delivery_problem_currency_symbol = salesforcePayload.delivery_problem.map(_.currencySymbol),
          delivery_problem_case_number = salesforcePayload.delivery_problem.map(_.caseNumber),

          // Delivery Address Change
          delivery_address_change_line1 =
            salesforcePayload.delivery_address_change.flatMap(_.mailingStreet).flatMap(sfStreetToLine1),
          delivery_address_change_line2 =
            salesforcePayload.delivery_address_change.flatMap(_.mailingStreet).flatMap(sfStreetToLine2),
          delivery_address_change_city = salesforcePayload.delivery_address_change.flatMap(_.mailingCity),
          delivery_address_change_state = salesforcePayload.delivery_address_change.flatMap(_.mailingState),
          delivery_address_change_postcode = salesforcePayload.delivery_address_change.flatMap(_.mailingPostalCode),
          delivery_address_change_country = salesforcePayload.delivery_address_change.flatMap(_.mailingCountry),
          delivery_address_change_effective_date_blurb =
            salesforcePayload.delivery_address_change.flatMap(_.addressChangeEffectiveDateBlurb),
        ),
      ),
    )

    BrazeSqsMessage(
      To = emailPayloadTo,
      DataExtensionName = SalesforceToBrazeCampaignMapping(salesforceBatchItem),
      SfContactId = Some(salesforcePayload.sf_contact_id),
      IdentityUserId = salesforcePayload.identity_id,
      recordId = salesforcePayload.record_id,
    )
  }
}
