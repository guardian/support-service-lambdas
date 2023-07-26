package com.gu.sf.move.subscriptions.api
import cats.implicits.toTraverseOps
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.{AwsSQSSend, SqsSync}
import com.gu.zuora.subscription.Subscription
import com.typesafe.scalalogging.LazyLogging
import io.circe.syntax.EncoderOps

trait UpdateSupporterProductData {
  def update(subscription: Subscription, identityId: String): Either[String, Unit]
}

class UpdateSupporterProductDataService(queueName: QueueName) extends UpdateSupporterProductData with LazyLogging {

  def combineErrorsOrUnit(list: List[Either[String, Unit]]): Either[String, Unit] = {
    val errors = list.collect { case Left(error) => error }
    if (errors.isEmpty) Right(()) else Left(errors.mkString(", "))
  }
  override def update(
      subscription: Subscription,
      identityId: String,
  ): Either[String, Unit] = {
    val sqsSync = SqsSync.send(SqsSync.buildClient)(queueName) _
    logger.info(s"Attempting to write to SQS ${queueName.value}, events: ${subscription.ratePlans}")
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
      .map(item => Payload(item.asJson.noSpaces))
      .map(payload => sqsSync(payload).toEither.left.map(_.getMessage))

    combineErrorsOrUnit(events)
  }
}
object UpdateSupporterProductDataService extends LazyLogging {
  def apply(stage: String): UpdateSupporterProductDataService = {
    logger.info(s"Creating UpdateSupporterProductDataService in environment $stage")
    new UpdateSupporterProductDataService(QueueName(s"supporter-product-data-$stage"))
  }
}
