package com.gu.holiday_stops

import com.gu.holiday_stops.subscription.RatePlan
import enumeratum.{Enum, EnumEntry}
import acyclic.skipped
import com.gu.holiday_stops.subscription.GuardianWeeklyRatePlanCondition

sealed abstract class ProductVariant(override val entryName: String) extends EnumEntry
object ProductVariant extends Enum[ProductVariant] {
  val values = findValues

  case object GuardianWeekly extends ProductVariant("Guardian Weekly")
  case object SaturdayVoucher extends ProductVariant("Saturday")
  case object SundayVoucher extends ProductVariant("Sunday")
  case object WeekendVoucher extends ProductVariant("Weekend")
  case object SixdayVoucher extends ProductVariant("Sixday")
  case object EverydayVoucher extends ProductVariant("Everyday")
  case object EverydayPlusVoucher extends ProductVariant("Everyday+")
  case object SixdayPlusVoucher extends ProductVariant("Sixday+")
  case object WeekendPlusVoucher extends ProductVariant("Weekend+")
  case object SundayPlusVoucher extends ProductVariant("Sunday+")
  case object SaturdayPlusVoucher extends ProductVariant("Saturday+")

  def apply(ratePlans: List[RatePlan]): ProductVariant = ratePlans collectFirst {
    case ratePlan if (GuardianWeeklyRatePlanCondition.productIsUnexpiredGuardianWeekly(ratePlan)) =>
      GuardianWeekly
    case ratePlan if (ratePlan.productName == "Newspaper Voucher" && withNameOption(ratePlan.ratePlanName).isDefined) =>
      withName(ratePlan.ratePlanName)
  } getOrElse {
    throw new RuntimeException(s"No supported product in list of rate plans : ${ratePlans.map(_.productName)}")
  }

}
