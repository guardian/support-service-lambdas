package com.gu.holidaystopprocessor

import java.time.LocalDate

case class SubscriptionUpdate(
  currentTerm: Option[Int],
  currentTermPeriodType: Option[String],
  add: Seq[Add]
) {

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

    case class ExtendedTerm(length: Int, unit: String)

    subscription.originalRatePlanCharge.flatMap(_.chargedThroughDate)
      .toRight(HolidayStopFailure("Original rate plan charge has no charged through date.  A bill run is needed to fix this.")).map { effectiveDate =>

        val extendedTerm: Option[ExtendedTerm] =
          if (effectiveDate.isAfter(subscription.termEndDate)) Some(ExtendedTerm(366, "Day"))
          else None

        SubscriptionUpdate(
          currentTerm = extendedTerm.map(_.length),
          currentTermPeriodType = extendedTerm.map(_.unit),
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
