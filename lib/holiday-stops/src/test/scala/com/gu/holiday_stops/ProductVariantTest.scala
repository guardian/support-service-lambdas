package com.gu.holiday_stops

import com.gu.holiday_stops.ProductVariant._
import com.gu.holiday_stops.subscription.RatePlan
import org.scalatest.{EitherValues, FlatSpec, Matchers}

class ProductVariantTest extends FlatSpec with Matchers with EitherValues {

  it should "convert list containing a GW rate plan to the 'GuardianWeekly' ProductVariant" in {

    val gwRatePlans = List(RatePlan(
      productName = "Guardian Weekly - Domestic",
      ratePlanName = "GW Oct 18 - Quarterly - Domestic",
      ratePlanCharges = Nil,
      productRatePlanId = "",
      id = ""
    ))

    ProductVariant(gwRatePlans) shouldBe GuardianWeekly

  }

  it should "convert list containing a Voucher rate plan to the right ProductVariant" in {

    val sixdayVoucherRatePlans = List(RatePlan(
      productName = "Newspaper Voucher",
      ratePlanName = "Sixday",
      ratePlanCharges = Nil,
      productRatePlanId = "",
      id = ""
    ))

    ProductVariant(sixdayVoucherRatePlans) shouldBe SixdayVoucher

    val everydayPlusVoucherRatePlans = List(RatePlan(
      productName = "Newspaper Voucher",
      ratePlanName = "Everyday+",
      ratePlanCharges = Nil,
      productRatePlanId = "",
      id = ""
    ))

    ProductVariant(everydayPlusVoucherRatePlans) shouldBe EverydayPlusVoucher

  }

  it should "error when it cannot determine a ProductVariant given a list of rate plans" in {

    assertThrows[RuntimeException] {
      ProductVariant(Nil)
    }

    assertThrows[RuntimeException] {
      ProductVariant(List(RatePlan(
        productName = "Magic",
        ratePlanName = "Newfangled",
        ratePlanCharges = Nil,
        productRatePlanId = "",
        id = ""
      )))
    }

  }

}
