package com.gu.payment_failure_comms.models

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

case class BrazeTrackRequest(events: List[CustomEvent])

// Based on https://www.braze.com/docs/api/objects_filters/event_object/
case class CustomEvent(external_id: String, app_id: String, name: String, time: String, properties: EventProperties)

case class EventProperties(currency: String, amount: Double)

object BrazeTrackRequest {
  def fromPaymentFailureCommsRequest(request: PaymentFailureCommsRequest, brazeId: String, zuoraAppId: String): BrazeTrackRequest = {
    BrazeTrackRequest(
      List(
        CustomEvent(
          external_id = brazeId,
          app_id = zuoraAppId,
          name = request.event,
          time = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss:SSSZ").format(ZonedDateTime.now),
          properties = request.properties
        )
      )
    )
  }

}