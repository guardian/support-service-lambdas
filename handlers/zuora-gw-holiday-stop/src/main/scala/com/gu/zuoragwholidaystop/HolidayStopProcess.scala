package com.gu.zuoragwholidaystop

object HolidayStopProcess {

  def apply(
      zuoraUrl: String,
      bearerToken: String,
      holidayCreditProductRatePlanId: String,
      holidayCreditProductRatePlanChargeId: String
  )(stop: HolidayStop): Either[String, ZuoraStatusResponse] = {

    val subscriptionDetails =
      Zuora.subscriptionGetResponse(zuoraUrl, bearerToken) _

    val updatedSubscription =
      Zuora.subscriptionUpdateResponse(zuoraUrl, bearerToken) _

    val holidayCreditToAdd = SubscriptionUpdate.holidayCreditToAdd(
      holidayCreditProductRatePlanId,
      holidayCreditProductRatePlanChargeId
    ) _

    subscriptionDetails(stop.subscriptionName).right flatMap { subscription =>
      val subscriptionUpdate =
        holidayCreditToAdd(subscription, stop.stoppedPublicationDate)
      updatedSubscription(stop.subscriptionName, subscriptionUpdate)
    }
  }
}
