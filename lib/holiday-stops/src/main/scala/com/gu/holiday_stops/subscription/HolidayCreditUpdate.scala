package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.{HolidayCreditProduct, ZuoraHolidayError}

case class HolidayCreditUpdate(
  currentTerm: Option[Int],
  currentTermPeriodType: Option[String],
  add: List[Add]
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
    maybeExtendedTerm: Option[ExtendedTerm],
    holidayCredit: HolidayStopCredit
  ): Either[ZuoraHolidayError, HolidayCreditUpdate] = {
    Right(
      HolidayCreditUpdate(
        currentTerm = maybeExtendedTerm.map(_.length),
        currentTermPeriodType = maybeExtendedTerm.map(_.unit),
        List(
          Add(
            productRatePlanId = holidayCreditProduct.productRatePlanId,
            contractEffectiveDate = holidayCredit.invoiceDate,
            customerAcceptanceDate = holidayCredit.invoiceDate,
            serviceActivationDate = holidayCredit.invoiceDate,
            chargeOverrides = List(
              ChargeOverride(
                productRatePlanChargeId = holidayCreditProduct.productRatePlanChargeId,
                HolidayStart__c = stoppedPublicationDate,
                HolidayEnd__c = stoppedPublicationDate,
                price = holidayCredit.amount
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
  chargeOverrides: List[ChargeOverride]
)

case class ChargeOverride(
  productRatePlanChargeId: String,
  HolidayStart__c: LocalDate,
  HolidayEnd__c: LocalDate,
  price: Double
)
