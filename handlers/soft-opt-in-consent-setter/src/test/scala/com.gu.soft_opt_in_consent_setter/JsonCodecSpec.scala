package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SFBuyer, SFSubRecord, SFSubRecordResponse, SFSubscription__r}
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData.subRecord2
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import io.circe.Decoder
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

class JsonCodecSpec extends AnyFlatSpec with should.Matchers {
  it should "JSON Decoding: decodes SF_Subscription__c correctly" in {
    val json = Source.fromResource("subRatePlanUpdateRecords.json").mkString

    val record = decode[SFSubRecordResponse](json)

    record shouldBe Right(SFSubRecordResponse(1, true, records = Seq(subRecord2)))
  }
}
