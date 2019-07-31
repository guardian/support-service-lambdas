package com.gu.holidaystopprocessor

import java.time.LocalDate

case class HolidayCreditUpdate(
  currentTerm: Option[Int],
  currentTermPeriodType: Option[String],
  add: Seq[Add]
)

/**
 * This builds the actual request body to add Holiday Credit RatePlanCharge in Zuora.
 * It should not contain business logic. Any business logic should be moved out to the
 * main for-comprehension.
 */
object HolidayCreditUpdate {

  def apply(
    holidayCreditProduct: HolidayCreditProduct,
    subscription: Subscription,
    stoppedPublicationDate: LocalDate,
    nextInvoiceStartDate: LocalDate,
    maybeExtendedTerm: Option[ExtendedTerm],
    holidayCredit: Double
  ): Either[HolidayStopFailure, HolidayCreditUpdate] = {
    Right(
      HolidayCreditUpdate(
        currentTerm = maybeExtendedTerm.map(_.length),
        currentTermPeriodType = maybeExtendedTerm.map(_.unit),
        Seq(
          Add(
            productRatePlanId = holidayCreditProduct.productRatePlanId,
            contractEffectiveDate = nextInvoiceStartDate,
            customerAcceptanceDate = nextInvoiceStartDate,
            serviceActivationDate = nextInvoiceStartDate,
            chargeOverrides = Seq(
              ChargeOverride(
                productRatePlanChargeId = holidayCreditProduct.productRatePlanChargeId,
                HolidayStart__c = stoppedPublicationDate,
                HolidayEnd__c = stoppedPublicationDate,
                price = holidayCredit
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
