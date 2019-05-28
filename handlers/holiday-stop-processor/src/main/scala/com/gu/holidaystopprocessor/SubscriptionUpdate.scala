package com.gu.holidaystopprocessor

import java.time.LocalDate

case class SubscriptionUpdate(currentTerm: Option[Int], add: Seq[Add]) {

  val price: Double = {
    val optPrice = for {
      firstAdd <- add.headOption
      charge <- firstAdd.chargeOverrides.headOption
    } yield charge.price
    optPrice.getOrElse(0)
  }
}

object SubscriptionUpdate {

  // In Zuora, the current term has to be extended beyond the effective date of any update
  private def extendedTerm(subscription: Subscription, effectiveDate: LocalDate): Option[Int] =
    if (effectiveDate.isAfter(subscription.termEndDate)) {
      subscription.currentTermPeriodType match {
        case "Month" => Some(24)
        case _ => None
      }
    } else None

  def holidayCreditToAdd(
    config: Config,
    subscription: Subscription,
    stoppedPublicationDate: LocalDate
  ): SubscriptionUpdate = {
    val effectiveDate = subscription.originalRatePlanCharge map {
      _.effectiveEndDate.plusDays(1)
    } getOrElse stoppedPublicationDate
    SubscriptionUpdate(
      currentTerm = extendedTerm(subscription, effectiveDate),
      Seq(
        Add(
          productRatePlanId = config.holidayCreditProductRatePlanId,
          contractEffectiveDate = effectiveDate,
          customerAcceptanceDate = effectiveDate,
          serviceActivationDate = effectiveDate,
          chargeOverrides = Seq(
            ChargeOverride(
              productRatePlanChargeId = config.holidayCreditProductRatePlanChargeId,
              HolidayStart__c = stoppedPublicationDate,
              HolidayEnd__c = stoppedPublicationDate,
              price = HolidayCredit(subscription)
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
