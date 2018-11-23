package com.gu.batchemailsender.api.batchemail.model

import org.scalatest.FlatSpec

class EmailToSendTest extends FlatSpec {

  "EmailToSendTest.fromEmailBatchItem" should "create an email to send" in {
    val email = "dlasdj@dasd.com"
    val emailBatchItem = EmailBatchItem(
      payload = EmailBatchItemPayload(
        record_id = EmailBatchItemId("0038E00000KtDaHQUX"),
        to_address = email,
        subscriber_id = SubscriberId("A-S00044748"),
        sf_contact_id = SfContactId("0036E00000KtDaHQAV"),
        product = "Membership",
        next_charge_date = "3 September 2018",
        last_name = "bla",
        identity_id = Some(IdentityUserId("30002177")),
        first_name = "something",
        email_stage = "MBv1 - 1"
      ),
      object_name = "Card_Expiry__c"
    )

    val expected = EmailToSend(
      To = EmailPayloadTo(
        Address = email,
        SubscriberKey = email,
        ContactAttributes = EmailPayloadContactAttributes(
          SubscriberAttributes = Map(
            "first_name" -> "something",
            "last_name" -> "bla",
            "subscriber_id" -> "A-S00044748",
            "next_charge_date" -> "3 September 2018"
          )
        )
      ),
      DataExtensionName = "expired-card",
      SfContactId = Some("0036E00000KtDaHQAV"),
      IdentityUserId = Some("30002177")
    )

    assert(EmailToSend.fromEmailBatchItem(emailBatchItem, "expired-card") == expected)
  }

}
