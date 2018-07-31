package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{ChargeOverrides, SubscribeToRatePlans, WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.newproduct.api.addsubscription._
import com.gu.util.resthttp.RestRequestMaker.{RequestsPost, WithCheck}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

class CreateSubscriptionTest extends FlatSpec with Matchers {

  it should "get account as object" in {

    val ids = PlanAndCharge(
      productRatePlanId = ProductRatePlanId("hiProductRatePlanId"),
      productRatePlanChargeId = ProductRatePlanChargeId("hiProductRatePlanChargeId")
    )
    val expectedReq = WireCreateRequest(
      accountKey = "zac",
      autoRenew = true,
      contractEffectiveDate = "2018-07-17",
      termType = "TERMED",
      renewalTerm = 12,
      initialTerm = 12,
      AcquisitionCase__c = "casecase",
      AcquisitionSource__c = "sourcesource",
      CreatedByCSR__c = "csrcsr",
      subscribeToRatePlans = List(
        SubscribeToRatePlans(
          productRatePlanId = "hiProductRatePlanId",
          chargeOverrides = List(ChargeOverrides(price = 1.25, productRatePlanChargeId = "hiProductRatePlanChargeId"))
        )
      )
    )
    val accF: RequestsPost[WireCreateRequest, WireSubscription] = {
      case (req, "subscriptions", WithCheck) if req == expectedReq =>
        ClientSuccess(WireSubscription("a-s123"))
      case in => GenericError(s"bad request: $in")
    }
    val createReq = CreateReq(
      accountId = ZuoraAccountId("zac"),
      amountMinorUnits = AmountMinorUnits(125),
      start = LocalDate.of(2018, 7, 17),
      acquisitionCase = CaseId("casecase"),
      acquisitionSource = AcquisitionSource("sourcesource"),
      createdByCSR = CreatedByCSR("csrcsr")
    )
    val actual = CreateSubscription(ids, accF)(createReq)
    actual shouldBe ClientSuccess(SubscriptionName("a-s123"))
  }
}

