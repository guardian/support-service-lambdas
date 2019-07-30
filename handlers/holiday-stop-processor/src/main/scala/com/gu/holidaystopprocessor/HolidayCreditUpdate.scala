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
    stoppedPublicationDate: LocalDate,
    nextInvoiceStartDate: LocalDate,
    maybeExtendedTerm: Option[ExtendedTerm]
  ): Either[HolidayStopFailure, HolidayCreditUpdate] = {
    Right(
      HolidayCreditUpdate(
        currentTerm = maybeExtendedTerm.map(_.length),
        currentTermPeriodType = maybeExtendedTerm.map(_.unit),
        Seq(
          Add(
            productRatePlanId = config.holidayCreditProductRatePlanId,
            contractEffectiveDate = nextInvoiceStartDate,
            customerAcceptanceDate = nextInvoiceStartDate,
            serviceActivationDate = nextInvoiceStartDate,
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
