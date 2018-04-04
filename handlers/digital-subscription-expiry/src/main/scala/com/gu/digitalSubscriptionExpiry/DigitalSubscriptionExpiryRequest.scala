package main.scala.com.gu.digitalSubscriptionExpiry

import play.api.libs.json._

case class DigitalSubscriptionExpiryRequest(
  appId: String,
  deviceId: String,
  subscriberId: String,
  password: String
)

object DigitalSubscriptionExpiryRequest {
  implicit val digitalSubscriptionExpiryCalloutFormat = Json.format[DigitalSubscriptionExpiryRequest]
}
