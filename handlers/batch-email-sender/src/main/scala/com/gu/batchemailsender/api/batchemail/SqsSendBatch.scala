package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.model.{EmailBatchItem, EmailBatchItemId, EmailToSend}
import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.util.Logging
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

object SqsSendBatch extends Logging {

  def sendBatchSync(sqsSend: Payload => Try[Unit])(emailBatchItems: List[EmailBatchItem]): List[EmailBatchItemId] = {
    def sendAndRetainItemIdOnFailure(payload: Payload, emailBatchItemId: EmailBatchItemId): Option[EmailBatchItemId] = {
      Try(sqsSend(payload)) match {
        case Success(_) => None
        case Failure(_) =>
          Some(emailBatchItemId)
      }
    }

    emailBatchItems flatMap { emailBatchItem: EmailBatchItem =>
      val brazeCampaignId: Option[String] = DataExtensionMap.getDataExtension(emailBatchItem.object_name) //TODO use this rather than expired-card every time

      val emailToSend = EmailToSend.fromEmailBatchItem(emailBatchItem, "expired-card")
      val payloadString = Json.prettyPrint(Json.toJson(emailToSend))

      sendAndRetainItemIdOnFailure(Payload(payloadString), emailBatchItem.payload.record_id)
    }

  }
}
