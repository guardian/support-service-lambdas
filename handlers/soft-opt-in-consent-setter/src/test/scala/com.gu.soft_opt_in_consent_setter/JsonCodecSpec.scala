package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{
  SFBuyer,
  SFSubscription__r,
  SubscriptionRatePlanUpdateRecord,
  SubscriptionRatePlanUpdateRecordResponse,
}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

class JsonCodecSpec extends AnyFlatSpec with should.Matchers {
  it should "JSON Decoding: decodes Subscription_Rate_Plan_Update__c correctly" in {
    val json = Source.fromResource("subRatePlanUpdateRecords.json").mkString

    val record = decode[SubscriptionRatePlanUpdateRecordResponse](json)

    record shouldBe Right(
      SubscriptionRatePlanUpdateRecordResponse(
        2,
        true,
        List(
          SubscriptionRatePlanUpdateRecord(
            "a0s9E00000ehvxUQAQ",
            "RP0001",
            "Contribution",
            SFSubscription__r("Newspaper - Digital Voucher", "Active", SFBuyer("200000692")),
            false,
            0,
          ),
          SubscriptionRatePlanUpdateRecord(
            "a0s9E00000eVh7yQAC",
            "RP0000",
            "Contribution",
            SFSubscription__r("Contribution", "Active", SFBuyer("200065730")),
            true,
            1,
          ),
        ),
      ),
    )
  }
}
