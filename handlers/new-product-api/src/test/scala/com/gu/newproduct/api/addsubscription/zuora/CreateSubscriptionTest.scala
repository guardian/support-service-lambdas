package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{
  ChargeOverrides,
  SubscribeToRatePlans,
  WireCreateRequest,
  WireSubscription,
}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{
  ChargeOverride,
  SubscriptionName,
  ZuoraCreateSubRequest,
  ZuoraCreateSubRequestRatePlan,
}
import com.gu.newproduct.api.addsubscription._
import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.util.resthttp.RestRequestMaker.{RequestsPost, WithCheck}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CreateSubscriptionTest extends AnyFlatSpec with Matchers {

  def currentDate = () => LocalDate.of(2018, 7, 2)
  it should "get account as object" in {

    val ids = PlanAndCharge(
      productRatePlanId = ProductRatePlanId("hiProductRatePlanId"),
      productRatePlanChargeId = ProductRatePlanChargeId("hiProductRatePlanChargeId"),
    )
    val expectedReq = WireCreateRequest(
      accountKey = "zac",
      autoRenew = true,
      contractEffectiveDate = "2018-07-02",
      customerAcceptanceDate = "2018-07-27",
      termType = "TERMED",
      renewalTerm = 12,
      initialTerm = 12,
      AcquisitionCase__c = "casecase",
      AcquisitionSource__c = "sourcesource",
      CreatedByCSR__c = "csrcsr",
      DeliveryAgent__c = None,
      subscribeToRatePlans = List(
        SubscribeToRatePlans(
          productRatePlanId = "hiProductRatePlanId",
          chargeOverrides = List(
            ChargeOverrides(
              price = Some(1.25),
              productRatePlanChargeId = "hiProductRatePlanChargeId",
              triggerDate = Some(LocalDate.of(2020, 1, 1)),
              triggerEvent = Some("USD"),
            ),
          ),
        ),
      ),
    )
    val accF: RequestsPost[WireCreateRequest, WireSubscription] = {
      case (req, "subscriptions", WithCheck) if req == expectedReq =>
        ClientSuccess(WireSubscription("a-s123"))
      case in => GenericError(s"bad request: $in")
    }
    val createReq = ZuoraCreateSubRequest(
      accountId = ZuoraAccountId("zac"),
      acceptanceDate = LocalDate.of(2018, 7, 27),
      acquisitionCase = CaseId("casecase"),
      acquisitionSource = AcquisitionSource("sourcesource"),
      createdByCSR = CreatedByCSR("csrcsr"),
      deliveryAgent = None,
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = ids.productRatePlanId,
          maybeChargeOverride = Some(
            ChargeOverride(
              amountMinorUnits = Some(AmountMinorUnits(125)),
              productRatePlanChargeId = ids.productRatePlanChargeId,
              triggerDate = Some(LocalDate.of(2020, 1, 1)),
            ),
          ),
        ),
      ),
    )
    val actual = CreateSubscription(accF, currentDate)(createReq)
    actual shouldBe ClientSuccess(SubscriptionName("a-s123"))
  }
}
