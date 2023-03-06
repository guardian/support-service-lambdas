package com.gu.digitalSubscriptionExpiry.responses

import com.gu.cas.SubscriptionCode
import java.time.LocalDate
import play.api.libs.json.{JsString, Json, Writes}
case class Expiry(
    expiryDate: LocalDate,
    expiryType: String,
    content: String = "SevenDay",
    subscriptionCode: Option[SubscriptionCode] = None,
    provider: Option[String] = None,
)

object Expiry {
  implicit val codeWrites = new Writes[SubscriptionCode] {
    override def writes(code: SubscriptionCode) = JsString(code.toString)
  }

  implicit val ExpiryWrites = Json.writes[Expiry]
}

case class AuthResponse(expiryDate: LocalDate)

//TODO do we need these? also do we need to return all the hardcoded values that cas returns?
object ExpiryType {
  val SUB = "sub"
  val FREE = "free"
  val SPECIAL = "special" // deprecated
  val DEFAULT = "default"
  val DEVICE_CONFIGURED = "deviceConfigured"
}

sealed trait DigitalSubscriptionExpiryResponse

case class SuccessResponse(expiry: Expiry) extends DigitalSubscriptionExpiryResponse

object SuccessResponse {
  implicit val successResponseWrites = Json.writes[SuccessResponse]
}

case class Error(message: String, code: Int)

object Error {
  implicit val errorWrites = Json.writes[Error]
}

case class ErrorResponse(error: Error) extends DigitalSubscriptionExpiryResponse

object ErrorResponse {
  implicit val errorResponseWrites = Json.writes[ErrorResponse]

  def apply(message: String, code: Int): ErrorResponse = ErrorResponse(Error(message, code))
}

object DigitalSubscriptionExpiryResponse {
  implicit val digitalSubscriptionExpiryResponseWrites = new Writes[DigitalSubscriptionExpiryResponse] {
    override def writes(response: DigitalSubscriptionExpiryResponse) = response match {
      case success: SuccessResponse => Json.toJson(success)
      case error: ErrorResponse => Json.toJson(error)
    }
  }
}
