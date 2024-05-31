package com.gu.productmove.zuora

import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.productmove.zuora.GetAccount.BasicInfo
import com.gu.productmove.*
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.GetSubscriptionToCancelResponse

import collection.mutable.Stack
import org.scalatest.*
import zio.json.*
import flatspec.*
import matchers.*

import java.time.LocalDate
import scala.io.Source

class JsonCodecSpec extends AnyFlatSpec {
  it should "JSON Encoding: correctly encode subscription update request for updating subscription payment amount" in {
    val updateRequestBody: SubscriptionUpdateRequest = UpdateSubscriptionAmount(
      List(
        UpdateSubscriptionAmountItem(
          LocalDate.of(2022, 2, 2),
          LocalDate.of(2022, 2, 2),
          LocalDate.of(2022, 2, 2),
          "ratePlanId",
          List(
            ChargeUpdateDetails(
              price = BigDecimal(20),
              ratePlanChargeId = "productRatePlanChargeId",
            ),
          ),
        ),
      ),
    )

    val expectedRequestBody: SubscriptionUpdateRequest = SwitchProductUpdateRequest(
      add = List(
        AddRatePlan(
          contractEffectiveDate = timeLocalDate,
          productRatePlanId = "8a128ed885fc6ded018602296ace3eb8",
          chargeOverrides = List(
            ChargeOverrides(
              price = Some(5.00),
              productRatePlanChargeId = "8a128d7085fc6dec01860234cd075270",
            ),
          ),
        ),
      ),
      remove = List(
        RemoveRatePlan(
          contractEffectiveDate = timeLocalDate,
          ratePlanId = "89ad8casd9c0asdcaj89sdc98as",
        ),
      ),
      collect = Some(true),
      runBilling = Some(true),
      preview = Some(false),
    )

    println(updateRequestBody.toJson)
    println(expectedRequestBody.toJson)
  }

  it should "JSON Decoding: null fields should convert to type None" in {
    val json = Source.fromResource("AccountBasicInfo2.json").mkString
    val expectedBasicInfo = BasicInfo(
      "2c92a0ff58bjkleb0158ff0351370sdf",
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
      "2c92a0ff58bjkleb0158ff0351370sdf",
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

  it should "Handle subscriptions with a discount" in {
    val json = Source.fromResource("zuoraResponses/GetSubscriptionToCancelResponse.json").mkString
    val response = json.fromJson[GetSubscriptionToCancelResponse]
    assert(response.isRight, response.left)
  }
}
