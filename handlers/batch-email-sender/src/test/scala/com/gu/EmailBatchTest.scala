package com.gu

import com.gu.batchemailsender.api.batchemail.model.EmailBatch.WireModel.WireEmailBatch
import com.gu.batchemailsender.api.batchemail.model._
import org.scalatest.FlatSpec
import play.api.libs.json.{JsResultException, Json}

class EmailBatchTest extends FlatSpec {

  "EmailBatch.fromWire" should "deserialise an email batch" in {
    val sampleBatch =
      """
        |{
        |   "batch_items":
        |   [
        |       {
        |         "payload":{
        |             "record_id":"a2E6E000000aBxr",
        |             "to_address":"dlasdj@dasd.com",
        |             "subscriber_id":"A-S00044748",
        |             "sf_contact_id":"0036E00000KtDaHQAV",
        |             "product":"Membership",
        |             "next_charge_date":"2018-09-03",
        |             "last_name":"bla",
        |             "identity_id":"30002177",
        |             "first_name":"something",
        |             "email_stage":"MBv1 - 1"
        |         },
        |         "object_name":"Card_Expiry__c"
        |       }
        |   ]
        |}
      """.stripMargin

    val expected = EmailBatch(
      List(
        EmailBatchItem(
          payload = EmailBatchItemPayload(
            record_id = EmailBatchItemId("a2E6E000000aBxr"),
            to_address = "dlasdj@dasd.com",
            subscriber_id = SubscriberId("A-S00044748"),
            sf_contact_id = SfContactId("0036E00000KtDaHQAV"),
            product = "Membership",
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
          ),
          object_name = "Card_Expiry__c"
        )
      )
    )

    val wireBatch = Json.parse(sampleBatch).as[WireEmailBatch]
    assert(EmailBatch.WireModel.fromWire(wireBatch) == expected)

  }

  "EmailBatch.fromWire" should "throw a jsresult exception when a required field is missing" in {
    val sampleBatch =
      """
        |{
        |     "batch_items":
        |   [
        |       {
        |         "payload":{
        |             "record_id":"a2E6E000000aBxr",
        |             "to_address":"dlasdj@dasd.com",
        |             "subscriber_id":"A-S00044748",
        |             "product":"Membership",
        |             "next_charge_date":"2018-09-03",
        |             "last_name":"bla",
        |             "identity_id":"30002177",
        |             "first_name":"something",
        |             "email_stage":"MBv1 - 1"
        |         },
        |         "object_name":"Card_Expiry__c"
        |       }
        |   ]
        |}
      """.stripMargin

    intercept[JsResultException] {
      val wireBatch: WireEmailBatch = Json.parse(sampleBatch).as[WireEmailBatch]
      EmailBatch.WireModel.fromWire(wireBatch)
    }
  }

  "EmailBatch.fromWire" should "not blow up when optional fields are missing" in {
    val sampleBatch =
      """
        |{
        |     "batch_items":
        |   [
        |       {
        |         "payload":{
        |             "record_id":"a2E6E000000aBxr",
        |             "to_address":"dlasdj@dasd.com",
        |             "subscriber_id":"A-S00044748",
        |             "sf_contact_id":"0036E00000KtDaHQAV",
        |             "product":"Membership",
        |             "next_charge_date":"2018-09-03",
        |             "last_name":"bla",
        |             "first_name":"something",
        |             "email_stage":"MBv1 - 1"
        |         },
        |         "object_name":"Card_Expiry__c"
        |       }
        |   ]
        |}
      """.stripMargin

    val expected = EmailBatch(
      List(
        EmailBatchItem(
          payload = EmailBatchItemPayload(
            record_id = EmailBatchItemId("a2E6E000000aBxr"),
            to_address = "dlasdj@dasd.com",
            subscriber_id = SubscriberId("A-S00044748"),
            sf_contact_id = SfContactId("0036E00000KtDaHQAV"),
            product = "Membership",
            next_charge_date = Some("3 September 2018"),
            last_name = "bla",
            identity_id = None,
            first_name = "something",
            email_stage = "MBv1 - 1",
            modified_by_customer = None,
            holiday_start_date = None,
            holiday_end_date = None,
            stopped_credit_sum = None,
            currency_symbol = None,
            stopped_issue_count = None,
            stopped_credit_summaries = None
          ),
          object_name = "Card_Expiry__c"
        )
      )
    )

    val wireBatch = Json.parse(sampleBatch).as[WireEmailBatch]
    assert(EmailBatch.WireModel.fromWire(wireBatch) == expected)

  }

  "EmailBatch.fromWire" should "transform a holiday-stop create confirmation correctly" in {
    val sampleBatch =
      """
        |{
        |     "batch_items":
        |   [
        |       {
        |         "payload":{
        |             "record_id":"a2E6E000000aBxr",
        |             "to_address":"dlasdj@dasd.com",
        |             "subscriber_id":"A-S00044748",
        |             "sf_contact_id":"0036E00000KtDaHQAV",
        |             "product":"Membership",
        |             "next_charge_date":"2018-09-03",
        |             "last_name":"bla",
        |             "first_name":"something",
        |             "email_stage":"create",
        |             "modified_by_customer": false,
        |             "holiday_stop_request":
        |             {
        |               "holiday_start_date": "2019-09-27",
        |               "holiday_end_date": "2019-10-12",
        |               "stopped_credit_sum": "97.42",
        |               "currency_symbol": "&pound;",
        |               "stopped_issue_count": "3",
        |               "stopped_credit_summaries": [
        |                 {
        |                   "credit_amount": 1.23,
        |                   "credit_date": "2019-11-22"
        |                 },
        |                 {
        |                   "credit_amount": 2.34,
        |                   "credit_date": "2019-02-23"
        |                 }
        |               ]
        |             }
        |         },
        |         "object_name":"Holiday_Stop_Request__c"
        |       }
        |   ]
        |}
      """.stripMargin

    val expected = EmailBatch(
      List(
        EmailBatchItem(
          payload = EmailBatchItemPayload(
            record_id = EmailBatchItemId("a2E6E000000aBxr"),
            to_address = "dlasdj@dasd.com",
            subscriber_id = SubscriberId("A-S00044748"),
            sf_contact_id = SfContactId("0036E00000KtDaHQAV"),
            product = "Membership",
            next_charge_date = Some("3 September 2018"),
            last_name = "bla",
            identity_id = None,
            first_name = "something",
            email_stage = "create",
            modified_by_customer = Some(false),
            holiday_start_date = Some(HolidayStartDate("27 September 2019")),
            holiday_end_date = Some(HolidayEndDate("12 October 2019")),
            stopped_credit_sum = Some(StoppedCreditSum("97.42")),
            currency_symbol = Some(CurrencySymbol("&pound;")),
            stopped_issue_count = Some(StoppedIssueCount("3")),
            stopped_credit_summaries = Some(
              List(
                StoppedCreditSummary(StoppedCreditSummaryAmount(1.23), StoppedCreditSummaryDate("22 November 2019")),
                StoppedCreditSummary(StoppedCreditSummaryAmount(2.34), StoppedCreditSummaryDate("23 February 2019"))
              )
            )
          ),
          object_name = "Holiday_Stop_Request__c"
        )
      )
    )

    val wireBatch = Json.parse(sampleBatch).as[WireEmailBatch]
    assert(EmailBatch.WireModel.fromWire(wireBatch) == expected)

  }

  "fromSfDateToDisplayDate" should "read a date in format 2018-11-14 and return it as 14 November 2018" in {
    assert(EmailBatch.WireModel.fromSfDateToDisplayDate("2018-11-14") == "14 November 2018")
  }

  it should "read handle single digit dates too" in {
    assert(EmailBatch.WireModel.fromSfDateToDisplayDate("2018-11-04") == "4 November 2018")
  }

  it should "return what was passed in if the data cannot be parsed" in {
    assert(EmailBatch.WireModel.fromSfDateToDisplayDate("2018/11/04") == "2018/11/04")
  }

}
