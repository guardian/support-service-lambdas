package com.gu.paymentFailureUpdatesInZuora

import io.circe.{Decoder, Encoder}
import io.circe.parser.decode
import io.circe.generic.auto._

import java.time.{Instant, LocalDateTime, ZoneOffset}
import java.time.format.DateTimeFormatter

// ----- Config ----- //

case class Config(endpointSecret: String, zuoraBaseUrl: String, zuoraClientId: String, zuoraSecret: String)

// ----- Stripe webhook ----- //

case class DisputeMetaData(zpayment_number: Option[String])


case class DisputeObject(
    id: String,
    amount: Long,
    charge: String,
    metadata: DisputeMetaData,
    payment_intent: Option[String],
    payment_method_types: List[String],
    status: String,
    created: Long,
    reason: String,
)

case class DisputeData(`object`: DisputeObject)

case class DisputeEvent(data: DisputeData)

object DisputeEvent {
  implicit val decoder = Decoder[DisputeEvent]

  def fromJson(json: String): Either[Error, DisputeEvent] =
    decode[DisputeEvent](json).left.map(e => InvalidJsonError(e.getMessage()))
}

sealed trait Dispute

case class SepaDispute(paymentNumber: String, disputeObject: DisputeObject) extends Dispute

case class OtherDispute() extends Dispute

object Dispute {
  def fromEvent(event: DisputeEvent): Either[Error, Dispute] = {
    val disputeObj = event.data.`object`

    if (disputeObj.payment_method_types.contains("sepa_debit")) {
      disputeObj.metadata.zpayment_number match {
        case Some(paymentNumber) => Right(SepaDispute(paymentNumber, disputeObj))
        case None => Left(MissingPaymentNumberError("No zuora payment number"))
      }
    } else {
      Right(OtherDispute())
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

// Settle dispute

case class ZuoraUpdateDisputeDetails(gatewayResponse: String, referenceId: String, settledOn: String, gatewayReconciliationStatus: String, gatewayReconciliationReason: String)



object ZuoraUpdateDisputeDetails{
  implicit val encoder = Encoder[ZuoraUpdateDisputeDetails]

  private val dtFormat = DateTimeFormatter.ofPattern("yyy-MM-dd HH:mm:ss")
  private def zuoraTimestampFromSecondsSinceEpoch(secondsSinceEpoch: Long): String =
    LocalDateTime
      .ofInstant(Instant.ofEpochMilli(secondsSinceEpoch * 1000), ZoneOffset.UTC)
      .format(dtFormat)

  def fromStripeDisputeObject(disputeObject: DisputeObject) = ZuoraUpdateDisputeDetails(
    gatewayResponse = disputeObject.status,
    referenceId = disputeObject.id,
    settledOn = zuoraTimestampFromSecondsSinceEpoch(disputeObject.created),
    gatewayReconciliationStatus = "Settled",
    gatewayReconciliationReason = "charge.dispute.closed.lost"
  )
}


case class ZuoraFailureReason(code: Long, message: String)
case class ZuoraRejectPaymentResponse(success: Boolean, reasons: Option[List[ZuoraFailureReason]])
case class ZuoraUpdateDisputeDetailsResponse(success: Boolean, reasons: Option[List[ZuoraFailureReason]])
