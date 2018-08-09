package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.productcatalog.PlanId
import org.scalatest.{FlatSpec, Matchers}

class ValidatePlanTest extends FlatSpec with Matchers {

  it should "fail on invalid plan" in {

    val actual = ValidatePlan(PlanId("oh no!"))
    actual.mapFailure(_.split(":")(0)) should be(Failed("unsupported plan"))

  }

  it should "pass on valid plan" in {

    ValidatePlan(PlanId("monthly_contribution")) should be(Passed(()))

  }

}
