package com.gu.holidaystopprocessor

import java.time.LocalDate

case class SubscriptionUpdate(currentTerm: Option[Int], add: Seq[Add])

object SubscriptionUpdate {

  def holidayCreditToAdd(config: Config)(
    subscription: Subscription,
    stoppedPublicationDate: LocalDate
  ): SubscriptionUpdate = {
    val credit = Credit.autoRenewingHolidayAmount(subscription)
    val effectiveDate = subscription.originalRatePlanCharge map {
      _.effectiveEndDate.plusDays(1)
    } getOrElse stoppedPublicationDate
    val currentTerm =
      if (effectiveDate.isAfter(subscription.termEndDate)) {
        subscription.currentTermPeriodType match {
          case "Month" => Some(24)
          case _ => None
        }
      } else None
    SubscriptionUpdate(
      currentTerm,
      Seq(
        Add(
          productRatePlanId = config.holidayCreditProductRatePlanId,
          contractEffectiveDate = effectiveDate,
          customerAcceptanceDate = effectiveDate,
          serviceActivationDate = effectiveDate,
          chargeOverrides = Seq(
            ChargeOverride(
              config.holidayCreditProductRatePlanChargeId,
              HolidayStart__c = stoppedPublicationDate,
              HolidayEnd__c = stoppedPublicationDate,
              price = credit
            )
          )
        )
      )
    )
  }
}

case class Add(
  productRatePlanId: String,
  contractEffectiveDate: LocalDate,
  customerAcceptanceDate: LocalDate,
  serviceActivationDate: LocalDate,
  chargeOverrides: Seq[ChargeOverride]
)

case class ChargeOverride(
  productRatePlanChargeId: String,
  HolidayStart__c: LocalDate,
  HolidayEnd__c: LocalDate,
  price: Double
)
