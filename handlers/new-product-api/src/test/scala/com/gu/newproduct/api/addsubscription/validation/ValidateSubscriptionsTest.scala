package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ValidateSubscriptionsTest extends AnyFlatSpec with Matchers {

  def sub(active: Boolean, rateplans: Set[String]) = Subscription(
    status = if (active) GetAccountSubscriptions.Active else GetAccountSubscriptions.NotActive,
    productRateplanIds = rateplans.map(ProductRatePlanId.apply),
  )

  private val contributionRateplans =
    List("monthyContributionRateplanId", "annualContributionRateplanId").map(ProductRatePlanId.apply)
  private val validationFailedMsg = "validation Failed!"

  it should "fail if account already has an active recurring contribution subscription" in {
    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("monthyContributionRateplanId", "someOtherPlan")),
    )

    val actual = ValidateSubscriptions(contributionRateplans, validationFailedMsg)(subs)

    actual shouldBe Failed(validationFailedMsg)
  }
  it should "succeed if account has inactive recurring subs" in {

    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = false, rateplans = Set("monthyContributionRateplanId", "someOtherPlan")),
    )

    ValidateSubscriptions(contributionRateplans, validationFailedMsg)(subs) shouldBe Passed(subs)
  }
  it should "succeed if account has no recurring subs" in {

    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("yetAnotherplan", "somePlan")),
    )

    ValidateSubscriptions(contributionRateplans, validationFailedMsg)(subs) shouldBe Passed(subs)
  }

}
