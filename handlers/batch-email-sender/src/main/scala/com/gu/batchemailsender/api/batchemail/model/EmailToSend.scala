package com.gu.batchemailsender.api.batchemail.model

import play.api.libs.json.Json

/**
 * This is what actually gets sent to SQS and the fields correspond to Braze api_trigger_properties.
 * For example, stopped_credit_summaries can be found in SV_HolidayStopConfirmation_GuardianWeeklyBodyCopy
 * Braze content block.
 *
 * FIXME: WireEmailBatchItemPayload -> EmailBatchItemPayload -> EmailPayloadSubscriberAttributes  ???
 * FIXME: For some reason this has to have flat structure?
 */
case class EmailPayloadSubscriberAttributes(
  first_name: String,
  last_name: String,
  subscriber_id: String,
  next_charge_date: Option[String],
  product: String,
  modified_by_customer: Option[Boolean],
  holiday_start_date: Option[String],
  holiday_end_date: Option[String],
  stopped_credit_sum: Option[String],
  currency_symbol: Option[String],
  stopped_issue_count: Option[String],
  stopped_credit_summaries: Option[List[EmailPayloadStoppedCreditSummary]],
  digital_voucher: Option[EmailPayloadDigitalVoucher],

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
  delivery_problem_type: Option[String] = None, // No delivery | Damaged paper
)
case class EmailPayloadDigitalVoucher(barcode_url: String)
case class EmailPayloadStoppedCreditSummary(credit_amount: Double, credit_date: String)
case class EmailPayloadContactAttributes(SubscriberAttributes: EmailPayloadSubscriberAttributes)
case class EmailPayloadTo(Address: String, SubscriberKey: String, ContactAttributes: EmailPayloadContactAttributes)
case class EmailToSend(To: EmailPayloadTo, DataExtensionName: String, SfContactId: Option[String], IdentityUserId: Option[String])

object EmailToSend {

  implicit val emailPayloadStoppedCreditDetailWriter = Json.writes[EmailPayloadStoppedCreditSummary]
  implicit val emailPayloadDigitalVoucherWriter = Json.writes[EmailPayloadDigitalVoucher]
  implicit val emailPayloadSubscriberAttributesWriter = Json.writes[EmailPayloadSubscriberAttributes]
  implicit val emailPayloadContactAttributesWriter = Json.writes[EmailPayloadContactAttributes]
  implicit val emailPayloadToWriter = Json.writes[EmailPayloadTo]
  implicit val emailToSendWriter = Json.writes[EmailToSend]

  /**
   * Builds actual model from wire (DTO) model
   */
  def fromEmailBatchItem(emailBatchItem: EmailBatchItem): EmailToSend = {
    val emailPayloadTo = EmailPayloadTo(
      Address = emailBatchItem.payload.to_address,
      SubscriberKey = emailBatchItem.payload.to_address,
      ContactAttributes = EmailPayloadContactAttributes(
        SubscriberAttributes = EmailPayloadSubscriberAttributes(
          emailBatchItem.payload.first_name,
          emailBatchItem.payload.last_name,
          emailBatchItem.payload.subscriber_id.value,
          emailBatchItem.payload.next_charge_date,
          emailBatchItem.payload.product,
          emailBatchItem.payload.modified_by_customer,
          emailBatchItem.payload.holiday_start_date.map(_.value),
          emailBatchItem.payload.holiday_end_date.map(_.value),
          emailBatchItem.payload.stopped_credit_sum.map(_.value),
          emailBatchItem.payload.currency_symbol.map(_.value),
          emailBatchItem.payload.stopped_issue_count.map(_.value),
          emailBatchItem.payload.stopped_credit_summaries.map { creditDetails =>
            creditDetails.map { creditDetail =>
              EmailPayloadStoppedCreditSummary(creditDetail.credit_amount.value, creditDetail.credit_date.value)
            }
          },
          emailBatchItem
            .payload
            .digital_voucher
            .map(digitalVoucher => EmailPayloadDigitalVoucher(digitalVoucher.barcodeUrl.value)),

          // Delivery Problem
          delivery_problem_action = emailBatchItem.payload.delivery_problem_action,
          delivery_problem_total_affected = emailBatchItem.payload.delivery_problem_total_affected,
          delivery_problem_affected_dates = emailBatchItem.payload.delivery_problem_affected_dates,
          delivery_problem_total_credit = emailBatchItem.payload.delivery_problem_total_credit,
          delivery_problem_invoice_date = emailBatchItem.payload.delivery_problem_invoice_date,
          delivery_problem_type = emailBatchItem.payload.delivery_problem_type
        )
      )
    )

    EmailToSend(
      To = emailPayloadTo,
      DataExtensionName = brazeCampaignId(emailBatchItem),
      SfContactId = Some(emailBatchItem.payload.sf_contact_id.value),
      IdentityUserId = emailBatchItem.payload.identity_id.map(_.value)
    )
  }

  // This is mapped to Braze Template API Identifier by membership-workflow
  // https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/services/BrazeTemplateLookupService.scala#L13
  private def brazeCampaignId(emailBatchItem: EmailBatchItem): String =
    (emailBatchItem.object_name, emailBatchItem.payload.email_stage) match {
      case ("Card_Expiry__c", _) => "expired-card"
      case ("DD_Mandate_Failure__c", "MF1") => "dd-mandate-failure-1"
      case ("DD_Mandate_Failure__c", "MF2") => "dd-mandate-failure-2"
      case ("DD_Mandate_Failure__c", "MF3") => "dd-mandate-failure-3"
      case ("DD_Mandate_Failure__c", "MF4") => "dd-mandate-failure-4"
      case ("DD_Mandate_Failure__c", "MF5") => "dd-mandate-failure-5"
      case ("DD_Mandate_Failure__c", "MF6") => "dd-mandate-failure-6"
      case ("DD_Mandate_Failure__c", "MF7") => "dd-mandate-failure-7"
      case ("DD_Mandate_Failure__c", "MF8") => "dd-mandate-failure-8"
      case ("Payment_Failure__c", "DD_PF1") => "SV_DDpaymentfailure1"
      case ("Payment_Failure__c", "DD_PF2") => "SV_DDpaymentfailure2"
      case ("Payment_Failure__c", "DD_PF3") => "SV_DDpaymentfailure3"
      case ("Payment_Failure__c", "DD_PF4") => "SV_DDpaymentfailure4"
      case ("Holiday_Stop_Request__c", "create") => "SV_HolidayStopConfirmation"
      case ("Holiday_Stop_Request__c", "amend") => "SV_HolidayStopAmend"
      case ("Holiday_Stop_Request__c", "withdraw") => "SV_HolidayStopWithdrawal"
      case ("Digital_Voucher__c", "create") => "SV_VO_NewCard"
      case ("Digital_Voucher__c", "replace") => "SV_VO_ReplacementCard"
      case ("Case", "Delivery issues") => "SV_DeliveryProblemConfirmation"
      case (objectName, emailStage) => throw new RuntimeException(s"Unrecognized (object_name, email_stage) = ($objectName, $emailStage). Please fix SF trigger.")
    }
}
