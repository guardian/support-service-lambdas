package com.gu.delivery_records_api.service.createproblem

import cats.data.EitherT
import com.gu.delivery_records_api.service.DeliveryRecordServiceError
import com.gu.salesforce.Contact

import java.time.LocalDate

trait CreateDeliveryProblemService[F[_]] {

  def createDeliveryProblemForSubscription(
      subscriptionNumber: String,
      contact: Contact,
      detail: CreateDeliveryProblem,
  ): EitherT[F, DeliveryRecordServiceError, Unit]

}

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
