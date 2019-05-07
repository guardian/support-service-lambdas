package com.gu.zuoragwholidaystop

import java.time.LocalDate

import com.gu.zuoragwholidaystop.Credit.autoRenewingHolidayCredit

case class SubscriptionUpdate(add: Seq[Add])

object SubscriptionUpdate {

  def holidayCreditToAdd(
      productRatePlanId: String,
      productRatePlanChargeId: String
  )(
      subscription: Subscription,
      stoppedPublicationDate: LocalDate
  ): SubscriptionUpdate = {
    val credit =
      autoRenewingHolidayCredit(subscription)
    SubscriptionUpdate(
      Seq(
        Add(
          productRatePlanId,
          contractEffectiveDate = stoppedPublicationDate,
          customerAcceptanceDate = stoppedPublicationDate,
          serviceActivationDate = stoppedPublicationDate,
          chargeOverrides = Seq(
            ChargeOverride(
              productRatePlanChargeId,
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
