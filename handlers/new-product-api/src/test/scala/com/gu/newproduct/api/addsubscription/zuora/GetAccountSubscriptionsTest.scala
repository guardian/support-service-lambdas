package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.{
  ZuoraRatePlan,
  ZuoraSubscription,
  ZuoraSubscriptionsResponse,
}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, NotActive, Subscription}
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.test.EffectsTest
import com.gu.util.resthttp.RestRequestMaker.IsCheckNeeded
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetAccountSubscriptionsTest extends AnyFlatSpec with Matchers {

  def subWith(number: String, status: String, rateplans: List[String]) = {
    ZuoraSubscription(
      subscriptionNumber = number,
      status = status,
      ratePlans = rateplans.map(ZuoraRatePlan),
    )
  }

  val fakeResponses = Map(
    "subscriptions/accounts/account1" -> ZuoraSubscriptionsResponse(
      List(
        subWith(
          number = "subNumber",
          status = "Active",
          rateplans = List("plan1", "plan2"),
        ),
        subWith(
          number = "subNumber2",
          status = "Cancelled",
          rateplans = List("plan3", "plan2", "plan2"),
        ),
      ),
    ),
  )

  def fakeGet(path: String, skipCheck: IsCheckNeeded) = ClientSuccess(fakeResponses(path))

  it should "get subscriptions from Account" taggedAs EffectsTest in {

    val actual = GetAccountSubscriptions(fakeGet)(ZuoraAccountId("account1"))

    val expected = List(
      Subscription(
        status = Active,
        productRateplanIds = Set(ProductRatePlanId("plan1"), ProductRatePlanId("plan2")),
      ),
      Subscription(
        status = NotActive,
        productRateplanIds = Set(ProductRatePlanId("plan3"), ProductRatePlanId("plan2")),
      ),
    )
    actual shouldBe ClientSuccess(expected)
  }

}
