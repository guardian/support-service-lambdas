package main.scala.com.gu.digitalSubscriptionExpiry

import play.api.libs.json._

case class DigitalSubscriptionExpiryCallout(
  appId: String,
  deviceId: String,
  subscriberId: String,
  password: String
)

object DigitalSubscriptionExpiryCallout {
  implicit val digitalSubscriptionExpiryCalloutFormat = Json.format[DigitalSubscriptionExpiryCallout]
}
