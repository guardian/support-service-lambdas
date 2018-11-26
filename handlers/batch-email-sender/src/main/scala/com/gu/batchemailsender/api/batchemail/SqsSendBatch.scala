package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.model.{EmailBatchItem, EmailBatchItemId, EmailToSend}
import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.util.Logging
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

object SqsSendBatch extends Logging {

  def sendBatchSync(sqsSend: Payload => Try[Unit])(emailBatchItems: List[EmailBatchItem]): List[EmailBatchItemId] = {
    def sqsWrapper(payload: Payload, emailBatchItemId: EmailBatchItemId): Option[EmailBatchItemId] = {
      sqsSend(payload) match {
        case Success(_) => None
        case Failure(_) => Some(emailBatchItemId)
      }
    }

    emailBatchItems flatMap { emailBatchItem: EmailBatchItem =>
      val brazeCampaignId: Option[String] = DataExtensionMap.getDataExtension(emailBatchItem.object_name) //TODO use this rather than expired-card every time
      logger.info(s"found campaign id ${brazeCampaignId}")
      val emailToSend = EmailToSend.fromEmailBatchItem(emailBatchItem, "expired-card")
      val payloadString = Json.prettyPrint(Json.toJson(emailToSend))
      logger.info(s"email to send: ${payloadString}")
      sqsWrapper(Payload(payloadString), emailBatchItem.payload.record_id)
    }

  }
}
