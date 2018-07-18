package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError, NotFound}
import org.scalatest.{FlatSpec, Matchers}

class ValidateSubscriptionsTest extends FlatSpec with Matchers {

  def validationError(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse(statusCode = "422", message = msg))

  def sub(active: Boolean, rateplans: Set[String]) = Subscription(
    status = if (active) GetAccountSubscriptions.Active else GetAccountSubscriptions.NotActive,
    productRateplanIds = rateplans.map(ProductRatePlanId)
  )

  val contributionRateplans = List("monthlyRatePlanId", "annualRateplanId").map(ProductRatePlanId)

  def fakeGetSubs(response: List[Subscription])(id: ZuoraAccountId) = {
    if (id.value == "zuoraAccountId") ClientSuccess(response) else throw new RuntimeException(s"Test Failed: unexpected accountid $id, expected 'zuoraAccountId")
  }

  it should "fail if account already has an active recurring contribution subscription" in {
    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("monthlyRatePlanId", "someOtherPlan"))
    )

    def getSubscriptions = fakeGetSubs(subs) _

    ValidateSubscriptions(fakeGetSubs(subs), contributionRateplans)(ZuoraAccountId("zuoraAccountId")) shouldBe validationError("Zuora account already has an active recurring contribution subscription")
  }
  it should "succeed if account has inactive recurring subs" in {

    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = false, rateplans = Set("monthlyRatePlanId", "someOtherPlan"))
    )

    def getSubscriptions = fakeGetSubs(subs) _

    ValidateSubscriptions(getSubscriptions, contributionRateplans)(ZuoraAccountId("zuoraAccountId")) shouldBe ContinueProcessing(())
  }
  it should "succeed if account has no recurring subs" in {

    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("yetAnotherplan", "somePlan"))
    )

    def getSubscriptions = fakeGetSubs(subs) _

    ValidateSubscriptions(getSubscriptions, contributionRateplans)(ZuoraAccountId("zuoraAccountId")) shouldBe ContinueProcessing(())
  }

  it should "return error if zuora call fails" in {

    def getAccountSubscriptions(id: ZuoraAccountId) = GenericError("zuora error")

    ValidateSubscriptions(getAccountSubscriptions, contributionRateplans)(ZuoraAccountId("zuoraAccountId")) shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
  }

  it should "return error if payment method id is invalid" in {

    def getAccountSubscriptions(id: ZuoraAccountId) = NotFound("not found")

    ValidateSubscriptions(getAccountSubscriptions, contributionRateplans)(ZuoraAccountId("zuoraAccountId")) shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
  }

}
