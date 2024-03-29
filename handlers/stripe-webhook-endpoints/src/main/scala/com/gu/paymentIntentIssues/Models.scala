package com.gu.paymentIntentIssues

import io.circe.{Decoder, Encoder}
import io.circe.parser.decode
import io.circe.generic.auto._

import java.time.{Instant, LocalDateTime, ZoneOffset}
import java.time.format.DateTimeFormatter

// ----- Config ----- //

case class Config(endpointSecret: String, zuoraBaseUrl: String, zuoraClientId: String, zuoraSecret: String)

// ----- Stripe webhook ----- //

case class PaymentIntentMetaData(zpayment_number: Option[String])

case class PaymentIntentObject(
    id: String,
    metadata: PaymentIntentMetaData,
    payment_method_types: List[String],
    status: String,
    created: Long,
)

case class PaymentIntentData(`object`: PaymentIntentObject)

case class PaymentIntentEvent(data: PaymentIntentData)

object PaymentIntentEvent {
  implicit val decoder = Decoder[PaymentIntentEvent]

  def fromJson(json: String): Either[Error, PaymentIntentEvent] =
    decode[PaymentIntentEvent](json).left.map(e => InvalidJsonError(e.getMessage()))
}

sealed trait PaymentIntent

case class SepaPaymentIntent(paymentNumber: String, paymentIntentObject: PaymentIntentObject) extends PaymentIntent

case class OtherPaymentIntent() extends PaymentIntent

object PaymentIntent {
  def fromEvent(event: PaymentIntentEvent): Either[Error, PaymentIntent] = {
    val obj = event.data.`object`

    if (obj.payment_method_types.contains("sepa_debit")) {
      obj.metadata.zpayment_number match {
        case Some(paymentNumber) => Right(SepaPaymentIntent(paymentNumber, obj))
        case None => Left(MissingPaymentNumberError("No zuora payment number"))
      }
    } else {
      Right(OtherPaymentIntent())
    }
  }
}

// ----- Errors ----- //

sealed trait Error {
  val message: String
}

case class ConfigLoadingError(message: String) extends Error

case class InvalidRequestError(message: String) extends Error

case class InvalidJsonError(message: String) extends Error

case class MissingPaymentNumberError(message: String) extends Error

case class ZuoraApiError(message: String) extends Error

// ----- Zuora api ----- //

// Auth

case class ZuoraRestConfig(baseUrl: String, accessToken: String)

// Query payments

case class ZuoraPaymentQueryResponse(records: List[ZuoraPayment])

case class ZuoraPayment(`Id`: String)

// Reject payment

case class ZuoraRejectPaymentBody(gatewayResponse: String, referenceId: String, settledOn: String)

object ZuoraRejectPaymentBody {
  implicit val encoder = Encoder[ZuoraRejectPaymentBody]

  private val dtFormat = DateTimeFormatter.ofPattern("yyy-MM-dd HH:mm:ss")
  private def zuoraTimestampFromSecondsSinceEpoch(secondsSinceEpoch: Long): String =
    LocalDateTime
      .ofInstant(Instant.ofEpochMilli(secondsSinceEpoch * 1000), ZoneOffset.UTC)
      .format(dtFormat)

  def fromStripePaymentIntentObject(paymentIntentObject: PaymentIntentObject) = ZuoraRejectPaymentBody(
    gatewayResponse = paymentIntentObject.status,
    referenceId = paymentIntentObject.id,
    settledOn = zuoraTimestampFromSecondsSinceEpoch(paymentIntentObject.created),
  )
}

case class ZuoraFailureReason(code: Long, message: String)
case class ZuoraRejectPaymentResponse(success: Boolean, reasons: Option[List[ZuoraFailureReason]])
