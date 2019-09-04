package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops._
import org.scalatest._

class PredictedInvoicedPeriodSpec extends FlatSpec with Matchers with OptionValues {

  val gwRatePlanCharge = RatePlanCharge(
    name = "GW Oct 18 - Quarterly - Domestic",
    number = "C-01646726",
    price = 37.5,
    billingPeriod = Some("Quarter"),
    effectiveStartDate = LocalDate.of(2019, 9, 13),
    chargedThroughDate = None,
    HolidayStart__c = None,
    HolidayEnd__c = None,
    processedThroughDate = None
  )

  val gwNForNRatePlanCharge = RatePlanCharge(
    name = "GW Oct 18 - First 6 issues - Domestic",
    number = "C-01646725",
    price = 6,
    billingPeriod = None,
    effectiveStartDate = LocalDate.of(2019, 8, 2),
    chargedThroughDate = Some(LocalDate.of(2019, 9, 13)),
    HolidayStart__c = None,
    HolidayEnd__c = None,
    processedThroughDate = Some(LocalDate.of(2019, 8, 2))
  )

  val guardianWeeklyWithoutInvoice = RatePlan(
    productName = "",
    ratePlanCharges = List(gwRatePlanCharge),
    productRatePlanId = "",
    id = ""
  )

  val gwNForN = RatePlan(
    productName = "",
    ratePlanCharges = List(gwNForNRatePlanCharge),
    productRatePlanId = "",
    id = ""
  )

  "PredictedInvoicedPeriod" should "predict quarterly invoiced period for GW+N-for-N scenario" in {
    PredictedInvoicedPeriod(guardianWeeklyWithoutInvoice, gwNForN)
      .value should be(CurrentInvoicedPeriod(LocalDate.of(2019, 9, 13), LocalDate.of(2019, 12, 13)))
  }

  it should "predict annual invoiced period for GW+N-for-N scenario" in {
    val annualGwWithoutInvoice = gwRatePlanCharge.copy(billingPeriod = Some("Annual"))
    PredictedInvoicedPeriod(guardianWeeklyWithoutInvoice.copy(ratePlanCharges = List(annualGwWithoutInvoice)), gwNForN)
      .value should be(CurrentInvoicedPeriod(LocalDate.of(2019, 9, 13), LocalDate.of(2020, 9, 13)))
  }

}
