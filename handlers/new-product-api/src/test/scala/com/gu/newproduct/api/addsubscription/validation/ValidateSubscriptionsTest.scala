package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import org.scalatest.{FlatSpec, Matchers}

class ValidateSubscriptionsTest extends FlatSpec with Matchers {

  def sub(active: Boolean, rateplans: Set[String]) = Subscription(
    status = if (active) GetAccountSubscriptions.Active else GetAccountSubscriptions.NotActive,
    productRateplanIds = rateplans.map(ProductRatePlanId)
  )

  private val contributionRateplans = List("monthyContributionRateplanId", "annualContributionRateplanId").map(ProductRatePlanId)

  it should "fail if account already has an active recurring contribution subscription" in {
    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("monthyContributionRateplanId", "someOtherPlan"))
    )

    val actual = ValidateSubscriptions(contributionRateplans)(subs)

    actual shouldBe Failed("Zuora account already has an active recurring contribution subscription")
  }
  it should "succeed if account has inactive recurring subs" in {

    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = false, rateplans = Set("monthyContributionRateplanId", "someOtherPlan"))
    )

    ValidateSubscriptions(contributionRateplans)(subs) shouldBe Passed(subs)
  }
  it should "succeed if account has no recurring subs" in {

    val subs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("yetAnotherplan", "somePlan"))
    )

    ValidateSubscriptions(contributionRateplans)(subs) shouldBe Passed(subs)
  }

}
