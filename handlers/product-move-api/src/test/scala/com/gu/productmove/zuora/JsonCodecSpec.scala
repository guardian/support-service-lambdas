package com.gu.productmove.zuora

import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.productmove.zuora.GetAccount.BasicInfo
import com.gu.productmove.*

import collection.mutable.Stack
import org.scalatest.*
import zio.json.*
import flatspec.*
import matchers.*

import java.time.LocalDate
import scala.io.Source

class JsonCodecSpec extends AnyFlatSpec {
  it should "JSON Decoding: null fields should convert to type None" in {
    val json = Source.fromResource("AccountBasicInfo2.json").mkString
    val expectedBasicInfo = BasicInfo(
      DefaultPaymentMethod("2c92a0fd590128e4015902ad34001c1f", None),
      None,
      "0030J00001tCDhGAMKL",
      0.0,
      Currency.GBP,
    )

    val basicInfo = json.fromJson[BasicInfo].getOrElse("")

    assert(basicInfo == expectedBasicInfo)
  }

  it should "JSON Decoding: empty strings should convert to type None" in {
    val json = Source.fromResource("AccountBasicInfo.json").mkString
    val expectedBasicInfo = BasicInfo(
      DefaultPaymentMethod("2c92a0fd590128e4015902ad34001c1f", None),
      None,
      "0030J00001tCDhGAMKL",
      0.0,
      Currency.GBP,
    )

    val basicInfo = json.fromJson[BasicInfo].getOrElse("")

    assert(basicInfo == expectedBasicInfo)
  }

  it should "Convert billingPeriod to enum when decoding GET (/v1/subscriptions/$subscriptionId) response" in {
    val json = Source.fromResource("zuoraResponses/GetSubscriptionResponse.json").mkString

    assert(json.fromJson[GetSubscriptionResponse].getOrElse("") == getSubscriptionResponse2)
  }

  it should "Correctly decode PUT (/v1/subscriptions/$subscriptionNumber/cancel) response with a negative invoice attached" in {
    val json = Source.fromResource("zuoraResponses/CancellationResponse1.json").mkString

    assert(json.fromJson[CancellationResponse].getOrElse("") == cancellationResponse1)
  }

  it should "Correctly decode PUT (/v1/subscriptions/$subscriptionNumber/cancel) response without a negative invoice attached" in {
    val json = Source.fromResource("zuoraResponses/CancellationResponse2.json").mkString

    assert(json.fromJson[CancellationResponse].getOrElse("") == cancellationResponse2)
  }

  it should "Correctly decode PUT (/v1/subscriptions/$subscriptionNumber) response where user made payment on switch" in {
    val json = Source.fromResource("zuoraResponses/SubscriptionUpdateResponse1.json").mkString

    assert(json.fromJson[SubscriptionUpdateResponse].getOrElse("") == subscriptionUpdateResponse4)
  }

  it should "Correctly decode PUT (/v1/subscriptions/$subscriptionNumber) response where user made no payment on switch" in {
    val json = Source.fromResource("zuoraResponses/SubscriptionUpdateResponse2.json").mkString

    assert(json.fromJson[SubscriptionUpdateResponse].getOrElse("") == subscriptionUpdateResponse5)
  }
}
