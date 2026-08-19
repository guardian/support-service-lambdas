package com.gu.productmove.zuora

import com.gu.productmove.*
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.GetSubscriptionToCancelResponse
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.GetAccount.BasicInfo
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import org.scalatest.*
import org.scalatest.flatspec.*
import zio.json.*

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
      LastPlanAddedDate__c = LocalDate.parse("2025-06-10"),
    )

    println(updateRequestBody.toJson)
    println(expectedRequestBody.toJson)
//    assertResult(updateRequestBody)(expectedRequestBody) TODO this test should assert
  }

  it should "JSON Decoding: null fields should convert to type None" in {
    val json = Source.fromResource("AccountBasicInfo2.json").mkString
    val expectedBasicInfo = BasicInfo(
      ZuoraAccountId("2c92a0ff58bjkleb0158ff0351370sdf"),
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
      ZuoraAccountId("2c92a0ff58bjkleb0158ff0351370sdf"),
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

  it should "encode a cancellation Order with today as its order date" in {
    val request = CancellationOrderRequest.forSubscription(
      AccountNumber("A0123456"),
      SubscriptionName("A-S0123456"),
      LocalDate.of(2026, 9, 1),
      LocalDate.of(2026, 8, 19),
    )

    assert(
      request.toJson ==
        """{"orderDate":"2026-08-19","existingAccountNumber":"A0123456","subscriptions":[{"subscriptionNumber":"A-S0123456","orderActions":[{"type":"CancelSubscription","triggerDates":[{"name":"ContractEffective","triggerDate":"2026-09-01"}],"cancelSubscription":{"cancellationPolicy":"SpecificDate","cancellationEffectiveDate":"2026-09-01"}}]}],"processingOptions":{"runBilling":false,"collectPayment":false}}""",
    )
  }

  it should "keep a backdated cancellation effective date separate from the order date" in {
    val request = CancellationOrderRequest.forSubscription(
      AccountNumber("A0123456"),
      SubscriptionName("A-S0123456"),
      LocalDate.of(2026, 8, 1),
      LocalDate.of(2026, 8, 19),
    )

    assert(
      request.toJson ==
        """{"orderDate":"2026-08-19","existingAccountNumber":"A0123456","subscriptions":[{"subscriptionNumber":"A-S0123456","orderActions":[{"type":"CancelSubscription","triggerDates":[{"name":"ContractEffective","triggerDate":"2026-08-01"}],"cancelSubscription":{"cancellationPolicy":"SpecificDate","cancellationEffectiveDate":"2026-08-01"}}]}],"processingOptions":{"runBilling":false,"collectPayment":false}}""",
    )
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
