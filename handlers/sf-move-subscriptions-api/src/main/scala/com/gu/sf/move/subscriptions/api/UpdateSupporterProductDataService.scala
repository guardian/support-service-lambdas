package com.gu.sf.move.subscriptions.api

import com.gu.effects.eventbridge.AwsEventBridge
import com.gu.effects.eventbridge.AwsEventBridge.{EventBusName, EventSource, DetailType, EventDetail}
import com.gu.sf.move.subscriptions.api.UpdateSupporterProductDataService.{
  SupporterRatePlanItemType,
  AddItemEventSource,
}
import com.gu.zuora.subscription.Subscription
import com.typesafe.scalalogging.LazyLogging
import io.circe.syntax.EncoderOps

trait UpdateSupporterProductData {
  def update(subscription: Subscription, identityId: String): Either[List[AwsEventBridge.PutEventError], Unit]
}

class UpdateSupporterProductDataService(eventBusName: EventBusName)
    extends UpdateSupporterProductData
    with LazyLogging {
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

    logger.info(s"Attempting to write to event bus ${eventBusName.value}, events: $events")
    AwsEventBridge.putEvents(AwsEventBridge.buildClient)(
      eventBusName,
      AddItemEventSource,
      SupporterRatePlanItemType,
      events,
    )
  }
}
object UpdateSupporterProductDataService extends LazyLogging {
  val AddItemEventSource = EventSource("com.gu.supporter-product-data.add-item")
  val SupporterRatePlanItemType = DetailType("SupporterRatePlanItem")
  def apply(stage: String) = {
    logger.info(s"Creating UpdateSupporterProductDataService in environment $stage")
    new UpdateSupporterProductDataService(EventBusName(s"supporter-product-data-$stage"))
  }
}
