package com.gu.digitalSubscriptionExpiry
import org.joda.time.{DateTime, LocalDate}
import play.api.libs.json.{JsString, Json, Writes}

sealed trait SubscriptionCode
case object SevenDay extends SubscriptionCode
case object Guardian extends SubscriptionCode

object SubscriptionCodeWrites {
  implicit val codeWrites = new Writes[SubscriptionCode] {
    override def writes(code: SubscriptionCode) = JsString(code.toString)
  }
}
case class Expiry(expiryDate: DateTime, expiryType: String, content: String = "SevenDay", subscriptionCode: Option[SubscriptionCode] = None, provider: Option[String] = None)

case class AuthResponse(expiryDate: LocalDate)

//TODO do we need these? also do we need to return all the hardcoded values that cas returns?
object ExpiryType {
  val SUB = "sub"
  val FREE = "free"
  val SPECIAL = "special" // deprecated
  val DEFAULT = "default"
  val DEVICE_CONFIGURED = "deviceConfigured"
}

object Expiry {
  import SubscriptionCodeWrites.codeWrites
  import play.api.libs.json.JodaWrites
  implicit val dateTimeWriter: Writes[DateTime] = JodaWrites.jodaDateWrites("yyyy-MM-dd")
  implicit val ExpiryWrites = Json.writes[Expiry]

}

case class DigitalSubscriptionExpiryResponse(expiry: Expiry)
object DigitalSubscriptionExpiryResponse {
  implicit val digitalSubscriptionExpiryCalloutWrites = Json.writes[DigitalSubscriptionExpiryResponse]
}
