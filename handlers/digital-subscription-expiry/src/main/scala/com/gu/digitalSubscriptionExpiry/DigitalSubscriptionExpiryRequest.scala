package main.scala.com.gu.digitalSubscriptionExpiry

import play.api.libs.json._

case class DigitalSubscriptionExpiryRequest(
  subscriberId: String,
  password: String
)

object DigitalSubscriptionExpiryRequest {
  implicit val digitalSubscriptionExpiryCalloutFormat = Json.format[DigitalSubscriptionExpiryRequest]
}
