package com.gu.holidaystopprocessor

import java.time.LocalDate

case class SubscriptionUpdate(add: Seq[Add])

object SubscriptionUpdate {

  def holidayCreditToAdd(config: Config)(
    subscription: Subscription,
    stoppedPublicationDate: LocalDate
  ): SubscriptionUpdate = {
    val credit = Credit.autoRenewingHolidayAmount(subscription)
    SubscriptionUpdate(
      Seq(
        Add(
          config.holidayCreditProductRatePlanId,
          contractEffectiveDate = stoppedPublicationDate,
          customerAcceptanceDate = stoppedPublicationDate,
          serviceActivationDate = stoppedPublicationDate,
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
