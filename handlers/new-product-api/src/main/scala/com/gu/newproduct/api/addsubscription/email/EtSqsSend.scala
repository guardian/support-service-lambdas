package com.gu.newproduct.api.addsubscription.email

import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.util.Logging
import play.api.libs.json.{Json, Writes}

import scala.concurrent.Future

object EtSqsSend extends Logging {

  def apply[FIELDS:Writes](sqsSend: Payload => Future[Unit]) = {etPayload: ETPayload[FIELDS] =>
    val payloadString = Json.prettyPrint(Json.toJson(etPayload))
    sqsSend(Payload(payloadString))
  }
}
