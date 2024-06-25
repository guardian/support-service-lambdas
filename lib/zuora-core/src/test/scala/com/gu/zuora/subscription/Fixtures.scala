package com.gu.zuora.subscription

import java.time.LocalDate

import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.Assertions

import scala.io.Source

object Fixtures extends Assertions {

  private def billingPeriodToMonths(billingPeriod: String): Int = billingPeriod match {
    case "Month" => 1
    case "Quarter" => 3
    case "Annual" => 12
    case "Semi_Annual" => 6
    case "Specific_Weeks" => 1
  }

  def mkRatePlanCharge(
      name: String,
      price: Double,
      billingPeriod: String,
      chargedThroughDate: Option[LocalDate] = Some(LocalDate.of(2019, 9, 2)),
      processedThroughDate: Option[LocalDate] = Some(LocalDate.of(2019, 8, 2)),
      effectiveStartDate: LocalDate = LocalDate.of(2019, 6, 2),
      specificBillingPeriod: Option[Int] = None,
      upToPeriodsType: Option[String] = None,
      upToPeriods: Option[Int] = None,
      endDateCondition: Option[String] = Some("Subscription_End"),
      billingDay: Option[String] = None,
      triggerEvent: Option[String] = Some("SpecificDate"),
      triggerDate: Option[LocalDate] = Some(LocalDate.of(2019, 6, 2)),
  ) = RatePlanCharge(
    name = name,
    number = "C1",
    price,
    Some(billingPeriod),
    effectiveStartDate,
    chargedThroughDate,
    HolidayStart__c = None,
    HolidayEnd__c = None,
    processedThroughDate = processedThroughDate,
    productRatePlanChargeId = "",
    specificBillingPeriod = specificBillingPeriod,
    endDateCondition = endDateCondition,
    upToPeriodsType = upToPeriodsType,
    upToPeriods = upToPeriods,
    billingDay = billingDay,
    triggerEvent = triggerEvent,
    triggerDate = triggerDate,
    discountPercentage = None,
    effectiveEndDate = LocalDate.now,
  )

  def mkGuardianWeeklySubscription(
      termStartDate: LocalDate = LocalDate.now(),
      termEndDate: LocalDate = LocalDate.now(),
      customerAcceptanceDate: LocalDate = LocalDate.now(),
      contractEffectiveDate: LocalDate = LocalDate.now(),
      price: Double = -1.0,
      billingPeriod: String = "Quarter",
      chargedThroughDate: Option[LocalDate] = None,
      effectiveStartDate: LocalDate = LocalDate.now(),
      accountNumber: String = "123456",
  ): Subscription =
    Subscription(
      subscriptionNumber = "S1",
      termStartDate,
      termEndDate,
      customerAcceptanceDate,
      contractEffectiveDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = List(
        RatePlan(
          productName = "Guardian Weekly - Domestic",
          ratePlanName = "GW Oct 18 - Quarterly - Domestic",
          ratePlanCharges = List(
            mkRatePlanCharge(
              name = "GW Oct 18 - Quarterly - Domestic",
              price = price,
              billingPeriod = billingPeriod,
              chargedThroughDate = chargedThroughDate,
              processedThroughDate = chargedThroughDate,
              effectiveStartDate = effectiveStartDate,
              triggerEvent = Some("SpecificDate"),
              triggerDate = Some(effectiveStartDate),
            ),
          ),
          productRatePlanId = "",
          id = "",
          lastChangeType = None,
        ),
      ),
      status = "Active",
      accountNumber = accountNumber,
    )

  def subscriptionFromJson(resource: String): Subscription = {
    val subscriptionRaw = Source.fromResource(resource).mkString
    decode[Subscription](subscriptionRaw).getOrElse(fail(s"Could not decode $subscriptionRaw"))
  }

  def accountFromJson(resource: String): ZuoraAccount = {
    val accountRaw = Source.fromResource(resource).mkString
    decode[ZuoraAccount](accountRaw).getOrElse(fail(s"Could not decode $accountRaw"))
  }

  def mkAccount(billCycleDay: Int = 1) = {
    ZuoraAccount(
      ZuoraAccountBillingAndPayment(billCycleDay = billCycleDay),
    )
  }
}
