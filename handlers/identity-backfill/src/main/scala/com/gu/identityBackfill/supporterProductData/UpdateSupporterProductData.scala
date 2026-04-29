package com.gu.identityBackfill.supporterProductData

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.typesafe.scalalogging.LazyLogging
import io.circe.syntax.EncoderOps
import software.amazon.awssdk.services.sqs.SqsClient

trait UpdateSupporterProductData {
  def update(subscriptions: List[ZuoraSubscription], identityId: IdentityId): Either[String, Unit]
}

class UpdateSupporterProductDataService(
    queueName: QueueName,
    sendMessage: (QueueName, Payload) => Either[String, Unit],
) extends UpdateSupporterProductData
    with LazyLogging {

  override def update(
      subscriptions: List[ZuoraSubscription],
      identityId: IdentityId,
  ): Either[String, Unit] = {
    val items = subscriptions.flatMap { sub =>
      sub.ratePlans.map { rp =>
        SupporterRatePlanItem(
          subscriptionName = sub.subscriptionName,
          identityId = identityId.value,
          productRatePlanId = rp.productRatePlanId,
          productRatePlanName = rp.ratePlanName,
          termEndDate = sub.termEndDate,
          contractEffectiveDate = sub.contractEffectiveDate,
        )
      }
    }

    if (items.isEmpty) {
      logger.info(s"No active rate plans for identity ${identityId.value}; nothing to send to ${queueName.value}")
      Right(())
    } else {
      logger.info(s"Sending ${items.size} rate plan messages to ${queueName.value}")
      val errors = items.flatMap { item =>
        sendMessage(queueName, Payload(item.asJson.noSpaces)) match {
          case Left(err) => Some(s"${item.subscriptionName}/${item.productRatePlanId}: $err")
          case Right(_) => None
        }
      }
      if (errors.isEmpty) Right(()) else Left(errors.mkString("; "))
    }
  }
}

object UpdateSupporterProductDataService {
  def apply(stage: String): UpdateSupporterProductDataService = {
    val client: SqsClient = SqsSync.buildClient
    val sendMessage: (QueueName, Payload) => Either[String, Unit] =
      (queue, payload) => SqsSync.send(client)(queue)(payload).toEither.left.map(_.getMessage)
    new UpdateSupporterProductDataService(QueueName(s"supporter-product-data-$stage"), sendMessage)
  }
}
