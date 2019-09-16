package com.gu.batchemailsender.api.batchemail.model

import org.scalatest.FlatSpec

class EmailToSendTest extends FlatSpec {
  val email = "dlasdj@dasd.com"

  val emailBatchItemPayloadStub =
    EmailBatchItemPayload(
      record_id = EmailBatchItemId("0038E00000KtDaHQUX"),
      to_address = email,
      subscriber_id = SubscriberId("A-S00044748"),
      sf_contact_id = SfContactId("0036E00000KtDaHQAV"),
      product = "Supporter",
      next_charge_date = "3 September 2018",
      last_name = "bla",
      identity_id = Some(IdentityUserId("30002177")),
      first_name = "something",
      email_stage = "MBv1 - 1"
    )

  val emailBatchItemStub = EmailBatchItem(
    payload = emailBatchItemPayloadStub,
    object_name = ""
  )

  val expectedStub = EmailToSend(
    To = EmailPayloadTo(
      Address = email,
      SubscriberKey = email,
      ContactAttributes = EmailPayloadContactAttributes(
        SubscriberAttributes = Map(
          "first_name" -> "something",
          "subscriber_id" -> "A-S00044748",
          "last_name" -> "bla",
          "next_charge_date" -> "3 September 2018",
          "product" -> "Supporter"
        )
      )
    ),
    DataExtensionName = "",
    SfContactId = Some("0036E00000KtDaHQAV"),
    IdentityUserId = Some("30002177")
  )

  "EmailToSendTest.fromEmailBatchItem" should "create CC Expiry email to send" in {
    val emailBatchItemCC = emailBatchItemStub.copy(
      object_name = "Card_Expiry__c",
      payload = emailBatchItemPayloadStub.copy(email_stage = "MBv1 - 1")
    )
    val expectedCC = expectedStub.copy(DataExtensionName = "expired-card")
    assert(EmailToSend.fromEmailBatchItem(emailBatchItemCC) == expectedCC)
  }

  it should "create Direct Debit Mandate Failure email to send" in {
    val emailBatchItemDD = emailBatchItemStub.copy(
      object_name = "DD_Mandate_Failure__c",
      payload = emailBatchItemPayloadStub.copy(email_stage = "MF1")
    )
    val expectedDD = expectedStub.copy(DataExtensionName = "dd-mandate-failure-1")
    assert(EmailToSend.fromEmailBatchItem(emailBatchItemDD) == expectedDD)
  }

  it should "create holiday-stop confirmation email to send" in {
    val emailBatchItem = emailBatchItemStub.copy(
      object_name = "Holiday_Stop_Request__c",
      payload = emailBatchItemPayloadStub.copy(email_stage = "create")
    )
    val expected = expectedStub.copy(DataExtensionName = "SV_HolidayStopConfirmation")
    assert(EmailToSend.fromEmailBatchItem(emailBatchItem) == expected)
  }

  it should "throw exception if it cannot recognize object_name" in {
    val emailBatchItemUnrecognized = emailBatchItemStub.copy(object_name = "unrecognized_object_name")
    assertThrows[RuntimeException](EmailToSend.fromEmailBatchItem(emailBatchItemUnrecognized))
  }
}
