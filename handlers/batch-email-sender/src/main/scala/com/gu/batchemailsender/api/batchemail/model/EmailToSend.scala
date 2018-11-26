package com.gu.batchemailsender.api.batchemail.model

import play.api.libs.json.Json

case class EmailPayloadContactAttributes(SubscriberAttributes: Map[String, String])
case class EmailPayloadTo(Address: String, SubscriberKey: String, ContactAttributes: EmailPayloadContactAttributes) {
}
case class EmailToSend(To: EmailPayloadTo, DataExtensionName: String, SfContactId: Option[String], IdentityUserId: Option[String])

object EmailToSend {

  implicit val emailPayloadContactAttributesWriter = Json.writes[EmailPayloadContactAttributes]
  implicit val emailPayloadToWriter = Json.writes[EmailPayloadTo]
  implicit val emailToSendWriter = Json.writes[EmailToSend]

  def fromEmailBatchItem(emailBatchItem: EmailBatchItem, brazeCampaignId: String): EmailToSend = {

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
      DataExtensionName = brazeCampaignId,
      SfContactId = Some(emailBatchItem.payload.sf_contact_id.value),
      IdentityUserId = emailBatchItem.payload.identity_id.map(_.value)
    )
  }

}

