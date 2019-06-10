package com.gu.holidaystopprocessor

import java.time.LocalDate

case class SubscriptionUpdate(add: Seq[Add]) {

  val price: Double = {
    val optPrice = for {
      firstAdd <- add.headOption
      charge <- firstAdd.chargeOverrides.headOption
    } yield charge.price
    optPrice.getOrElse(0)
  }
}

object SubscriptionUpdate {

  def holidayCreditToAdd(
    config: Config,
    subscription: Subscription,
    stoppedPublicationDate: LocalDate
  ): Either[HolidayStopFailure, SubscriptionUpdate] = {
    subscription.originalRatePlanCharge.flatMap(_.chargedThroughDate)
      .toRight(HolidayStopFailure("No effective date for amendment")).map { effectiveDate =>
        SubscriptionUpdate(
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
                  price = subscription.originalRatePlanCharge.map(HolidayCredit(_)).getOrElse(0)
                )
              )
            )
          )
        )
      }
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
