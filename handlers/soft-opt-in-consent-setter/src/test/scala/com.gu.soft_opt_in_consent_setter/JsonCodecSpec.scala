package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SFSubRecordResponse}
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData.{subRecord2, subRecord3}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import io.circe.generic.auto._
import io.circe.parser.decode

import scala.io.Source

class JsonCodecSpec extends AnyFlatSpec with should.Matchers {
  it should "JSON Decoding: decodes SF_Subscription__c correctly" in {
    val json = Source.fromResource("sfSubRecords.json").mkString

    val record = decode[SFSubRecordResponse](json)

    record shouldBe Right(SFSubRecordResponse(2, true, records = Seq(subRecord2, subRecord3)))
  }

  it should "JSON Decoding: decodes Mobile Purchases API (MPAPI) response correctly" in {
    val json = Source.fromResource("mobileSubscriptions.json").mkString

    val record = decode[MobileSubscriptions](json)

    record shouldBe Right(MobileSubscriptions(List(MobileSubscription(false, "InAppPurchase"))))
  }
}
