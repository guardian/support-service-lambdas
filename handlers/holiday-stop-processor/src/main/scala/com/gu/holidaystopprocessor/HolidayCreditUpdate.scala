package com.gu.holidaystopprocessor

import java.time.LocalDate

case class HolidayCreditUpdate(
  currentTerm: Option[Int],
  currentTermPeriodType: Option[String],
  add: Seq[Add]
)

/**
 * This builds the actual request body to add Holiday Credit RatePlanCharge in Zuora
 */
object HolidayCreditUpdate {

  def apply(
    config: Config,
    subscription: Subscription,
    stoppedPublicationDate: LocalDate
  ): Either[HolidayStopFailure, HolidayCreditUpdate] = {

    subscription
      .originalRatePlanCharge
      .flatMap(_.chargedThroughDate)
      .toRight(HolidayStopFailure("Original rate plan charge has no charged through date.  A bill run is needed to fix this."))
      .map { chargedThroughDate =>
        val extendedTerm = ExtendedTerm(chargedThroughDate, subscription)
        HolidayCreditUpdate(
          currentTerm = extendedTerm.map(_.length),
          currentTermPeriodType = extendedTerm.map(_.unit),
          Seq(
            Add(
              productRatePlanId = config.holidayCreditProductRatePlanId,
              contractEffectiveDate = chargedThroughDate,
              customerAcceptanceDate = chargedThroughDate,
              serviceActivationDate = chargedThroughDate,
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
