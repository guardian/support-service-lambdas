package com.gu.sf.move.subscriptions.api

import com.gu.effects.eventbridge.AwsEventBridge
import com.gu.effects.eventbridge.AwsEventBridge.{EventBusName, EventSource, DetailType, EventDetail}
import com.gu.sf.move.subscriptions.api.UpdateSupporterProductDataService.{
  AddItemEventSource,
  SupporterRatePlanItemType,
}
import com.gu.zuora.subscription.Subscription
import io.circe.syntax.EncoderOps

trait UpdateSupporterProductData {
  def update(subscription: Subscription, identityId: String): Either[List[AwsEventBridge.PutEventError], Unit]
}

class UpdateSupporterProductDataService(eventBusName: EventBusName) extends UpdateSupporterProductData {
  override def update(
      subscription: Subscription,
      identityId: String,
  ): Either[List[AwsEventBridge.PutEventError], Unit] = {
    val events = subscription.ratePlans
      .map(ratePlan =>
        SupporterRatePlanItem(
          subscription.subscriptionNumber,
          identityId,
          ratePlan.productRatePlanId,
          ratePlan.ratePlanName,
          subscription.termEndDate,
          subscription.contractEffectiveDate,
        ),
      )
      .map(item => EventDetail(item.asJson.noSpaces))

    AwsEventBridge.putEvents(AwsEventBridge.buildClient)(
      eventBusName,
      AddItemEventSource,
      SupporterRatePlanItemType,
      events,
    )
  }
}
object UpdateSupporterProductDataService {
  val AddItemEventSource = EventSource("com.gu.supporter-product-data.add-item")
  val SupporterRatePlanItemType = DetailType("SupporterRatePlanItem")
  def apply(stage: String) = {
    new UpdateSupporterProductDataService(EventBusName(s"supporter-product-data-$stage"))
  }
}
