package com.gu.batchemailsender.api.batchemail.model

import play.api.libs.json.Json

case class EmailPayloadContactAttributes(SubscriberAttributes: Map[String, String])
case class EmailPayloadTo(Address: String, SubscriberKey: String, ContactAttributes: EmailPayloadContactAttributes)
case class EmailToSend(To: EmailPayloadTo, DataExtensionName: String, SfContactId: Option[String], IdentityUserId: Option[String])

object EmailToSend {

  implicit val emailPayloadContactAttributesWriter = Json.writes[EmailPayloadContactAttributes]
  implicit val emailPayloadToWriter = Json.writes[EmailPayloadTo]
  implicit val emailToSendWriter = Json.writes[EmailToSend]

  def fromEmailBatchItem(emailBatchItem: EmailBatchItem): EmailToSend = {

    val customFields: Map[String, String] = Map(
      "first_name" -> emailBatchItem.payload.first_name,
      "last_name" -> emailBatchItem.payload.last_name,
      "subscriber_id" -> emailBatchItem.payload.subscriber_id.value,
      "next_charge_date" -> emailBatchItem.payload.next_charge_date,
      "product" -> emailBatchItem.payload.product
    )

    val emailPayloadTo = EmailPayloadTo(
      Address = emailBatchItem.payload.to_address,
      SubscriberKey = emailBatchItem.payload.to_address,
      ContactAttributes = EmailPayloadContactAttributes(
        SubscriberAttributes = customFields
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
      case (objectName, emailStage) => throw new RuntimeException(s"Unrecognized (object_name, email_stage) = ($objectName, $emailStage). Please fix SF trigger.")
    }
}

