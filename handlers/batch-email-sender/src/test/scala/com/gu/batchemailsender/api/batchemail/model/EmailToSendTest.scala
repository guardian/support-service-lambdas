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
      next_charge_date = Some("3 September 2018"),
      last_name = "bla",
      identity_id = Some(IdentityUserId("30002177")),
      first_name = "something",
      email_stage = "MBv1 - 1",
      modified_by_customer = None,
      holiday_start_date = None,
      holiday_end_date = None,
      stopped_credit_sum = None,
      currency_symbol = None,
      stopped_issue_count = None,
      stopped_credit_summaries = None
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
        SubscriberAttributes =
          EmailPayloadSubscriberAttributes(
            "something",
            "bla",
            "A-S00044748",
            Some("3 September 2018"),
            "Supporter",
            None,
            None,
            None,
            None,
            None,
            None
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

  it should "create holiday-stop creation confirmation email to send" in {
    val emailBatchItem = emailBatchItemStub.copy(
      object_name = "Holiday_Stop_Request__c",
      payload = emailBatchItemPayloadStub.copy(
        email_stage = "create",
        holiday_start_date = Some(HolidayStartDate("2019-11-01")),
        holiday_end_date = Some(HolidayEndDate("2019-11-17")),
        stopped_credit_sum = Some(StoppedCreditSum("11.24")),
        currency_symbol = Some(CurrencySymbol("&pound;")),
        stopped_issue_count = Some(StoppedIssueCount("2")),
        stopped_credit_summaries = Some(
          List(
            StoppedCreditSummary(StoppedCreditSummaryAmount(1.23), StoppedCreditSummaryDate("2020-01-01"))
          )
        )
      )
    )
    val expected = expectedStub.copy(
      To = expectedStub.To.copy(
        ContactAttributes = expectedStub.To.ContactAttributes.copy(
          expectedStub.To.ContactAttributes.SubscriberAttributes.copy(
            holiday_start_date = Some("2019-11-01"),
            holiday_end_date = Some("2019-11-17"),
            stopped_credit_sum = Some("11.24"),
            currency_symbol = Some("&pound;"),
            stopped_issue_count = Some("2"),
            stopped_credit_summaries = Some(
              List(
                EmailPayloadStoppedCreditSummary(1.23, "2020-01-01")
              )
            )
          )
        )
      ),
      DataExtensionName = "SV_HolidayStopConfirmation"
    )
    assert(EmailToSend.fromEmailBatchItem(emailBatchItem) == expected)
  }

  it should "create holiday-stop amendment confirmation email to send" in {
    val emailBatchItem = emailBatchItemStub.copy(
      object_name = "Holiday_Stop_Request__c",
      payload = emailBatchItemPayloadStub.copy(
        email_stage = "amend",
        holiday_start_date = Some(HolidayStartDate("2019-11-01")),
        holiday_end_date = Some(HolidayEndDate("2019-11-17")),
        stopped_credit_sum = Some(StoppedCreditSum("11.24")),
        currency_symbol = Some(CurrencySymbol("&pound;")),
        stopped_issue_count = Some(StoppedIssueCount("2")),
        stopped_credit_summaries = Some(
          List(
            StoppedCreditSummary(StoppedCreditSummaryAmount(1.23), StoppedCreditSummaryDate("2020-01-01"))
          )
        )
      )
    )
    val expected = expectedStub.copy(
      To = expectedStub.To.copy(
        ContactAttributes = expectedStub.To.ContactAttributes.copy(
          expectedStub.To.ContactAttributes.SubscriberAttributes.copy(
            holiday_start_date = Some("2019-11-01"),
            holiday_end_date = Some("2019-11-17"),
            stopped_credit_sum = Some("11.24"),
            currency_symbol = Some("&pound;"),
            stopped_issue_count = Some("2"),
            stopped_credit_summaries = Some(
              List(
                EmailPayloadStoppedCreditSummary(1.23, "2020-01-01")
              )
            )
          )
        )
      ),
      DataExtensionName = "SV_HolidayStopAmend"
    )
    assert(EmailToSend.fromEmailBatchItem(emailBatchItem) == expected)
  }

  it should "create holiday-stop withdrawal confirmation email to send" in {
    val emailBatchItem = emailBatchItemStub.copy(
      object_name = "Holiday_Stop_Request__c",
      payload = emailBatchItemPayloadStub.copy(
        email_stage = "withdraw",
        holiday_start_date = Some(HolidayStartDate("2019-11-01")),
        holiday_end_date = Some(HolidayEndDate("2019-11-17")),
        stopped_credit_sum = Some(StoppedCreditSum("11.24")),
        currency_symbol = Some(CurrencySymbol("&pound;")),
        stopped_issue_count = Some(StoppedIssueCount("2")),
        stopped_credit_summaries = Some(
          List(
            StoppedCreditSummary(StoppedCreditSummaryAmount(1.23), StoppedCreditSummaryDate("2020-01-01"))
          )
        )
      )
    )
    val expected = expectedStub.copy(
      To = expectedStub.To.copy(
        ContactAttributes = expectedStub.To.ContactAttributes.copy(
          expectedStub.To.ContactAttributes.SubscriberAttributes.copy(
            holiday_start_date = Some("2019-11-01"),
            holiday_end_date = Some("2019-11-17"),
            stopped_credit_sum = Some("11.24"),
            currency_symbol = Some("&pound;"),
            stopped_issue_count = Some("2"),
            stopped_credit_summaries = Some(
              List(
                EmailPayloadStoppedCreditSummary(1.23, "2020-01-01")
              )
            )
          )
        )
      ),
      DataExtensionName = "SV_HolidayStopWithdrawal"
    )
    assert(EmailToSend.fromEmailBatchItem(emailBatchItem) == expected)
  }

  it should "throw exception if it cannot recognize object_name" in {
    val emailBatchItemUnrecognized = emailBatchItemStub.copy(object_name = "unrecognized_object_name")
    assertThrows[RuntimeException](EmailToSend.fromEmailBatchItem(emailBatchItemUnrecognized))
  }

  it should "cope with a missing nextChargeDate" in {
    val emailBatchItem = emailBatchItemStub.copy(
      object_name = "Holiday_Stop_Request__c",
      payload = emailBatchItemPayloadStub.copy(
        email_stage = "create",
        next_charge_date = None,
        holiday_start_date = Some(HolidayStartDate("2019-11-01")),
        holiday_end_date = Some(HolidayEndDate("2019-11-17")),
        stopped_credit_sum = Some(StoppedCreditSum("11.24")),
        currency_symbol = Some(CurrencySymbol("&pound;")),
        stopped_issue_count = Some(StoppedIssueCount("2")),
        stopped_credit_summaries = Some(
          List(
            StoppedCreditSummary(StoppedCreditSummaryAmount(1.23), StoppedCreditSummaryDate("2020-01-01"))
          )
        )
      )
    )
    val expected = expectedStub.copy(
      To = expectedStub.To.copy(
        ContactAttributes = expectedStub.To.ContactAttributes.copy(
          expectedStub.To.ContactAttributes.SubscriberAttributes.copy(
            next_charge_date = None,
            holiday_start_date = Some("2019-11-01"),
            holiday_end_date = Some("2019-11-17"),
            stopped_credit_sum = Some("11.24"),
            currency_symbol = Some("&pound;"),
            stopped_issue_count = Some("2"),
            stopped_credit_summaries = Some(
              List(
                EmailPayloadStoppedCreditSummary(1.23, "2020-01-01")
              )
            )
          )
        )
      ),
      DataExtensionName = "SV_HolidayStopConfirmation"
    )
    assert(EmailToSend.fromEmailBatchItem(emailBatchItem) == expected)
  }
}
