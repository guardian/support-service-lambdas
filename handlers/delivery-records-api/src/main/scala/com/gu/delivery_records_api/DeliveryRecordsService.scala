package com.gu.delivery_records_api

import cats.data.EitherT
import com.gu.salesforce.Contact
import com.gu.salesforce.sttp.SFApiCompositeResponse

import java.time.LocalDate

case class DeliveryRecordToLink(
    id: String,
    creditAmount: Option[Double],
    invoiceDate: Option[LocalDate],
)

case class CreateDeliveryProblem(
    productName: String,
    description: Option[String],
    problemType: String,
    deliveryRecords: List[DeliveryRecordToLink],
    repeatDeliveryProblem: Option[Boolean],
    newContactPhoneNumbers: Option[SFApiContactPhoneNumbers],
) {
  val isHomeDelivery: Boolean = productName == "Home Delivery"

  val isNotAutoCredit: Boolean = deliveryRecords.exists(_.invoiceDate.isEmpty)

  val status: String =
    if (
      isHomeDelivery ||
      repeatDeliveryProblem.contains(true) ||
      isNotAutoCredit
    ) "New"
    else "Closed"

  val priority: Option[String] = Some("High").filter(_ => isNotAutoCredit && isHomeDelivery)
}

sealed trait DeliveryRecordServiceError

case class DeliveryRecordServiceGenericError(message: String) extends DeliveryRecordServiceError

case class DeliveryRecordServiceSubscriptionNotFound(message: String) extends DeliveryRecordServiceError

trait DeliveryRecordsService[F[_]] {

  def getDeliveryRecordsForSubscription(
      subscriptionId: String,
      contact: Contact,
      optionalStartDate: Option[LocalDate],
      optionalEndDate: Option[LocalDate],
      optionalCancellationEffectiveDate: Option[LocalDate],
  ): EitherT[F, DeliveryRecordServiceError, DeliveryRecordsApiResponse]

  def createDeliveryProblemForSubscription(
      subscriptionNumber: String,
      contact: Contact,
      detail: CreateDeliveryProblem,
  ): EitherT[F, DeliveryRecordServiceError, SFApiCompositeResponse]

}
