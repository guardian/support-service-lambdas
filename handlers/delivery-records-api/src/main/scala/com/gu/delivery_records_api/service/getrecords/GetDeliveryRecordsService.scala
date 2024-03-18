package com.gu.delivery_records_api.service.getrecords

import cats.data.EitherT
import com.gu.delivery_records_api.service.DeliveryRecordServiceError
import com.gu.delivery_records_api.service.createproblem.SFApiContactPhoneNumbers
import com.gu.salesforce.Contact

import java.time.LocalDate

trait GetDeliveryRecordsService[F[_]] {

  def getDeliveryRecordsForSubscription(
      subscriptionId: String,
      contact: Contact,
      optionalStartDate: Option[LocalDate],
      optionalEndDate: Option[LocalDate],
      optionalCancellationEffectiveDate: Option[LocalDate],
  ): EitherT[F, DeliveryRecordServiceError, DeliveryRecordsApiResponse]
}

final case class DeliveryProblemCase(
    id: String,
    ref: String,
    subject: Option[String],
    description: Option[String],
    problemType: Option[String],
)

case class DeliveryRecordsApiResponse(
    results: List[DeliveryRecord],
    deliveryProblemMap: Map[String, DeliveryProblemCase],
    contactPhoneNumbers: SFApiContactPhoneNumbers,
)

final case class DeliveryProblemCredit(
    amount: Double,
    invoiceDate: Option[LocalDate],
    isActioned: Boolean,
)

final case class DeliveryRecord(
    id: String,
    deliveryDate: Option[LocalDate],
    deliveryInstruction: Option[String],
    deliveryAddress: Option[String],
    addressLine1: Option[String],
    addressLine2: Option[String],
    addressLine3: Option[String],
    addressTown: Option[String],
    addressCountry: Option[String],
    addressPostcode: Option[String],
    hasHolidayStop: Option[Boolean],
    bulkSuspensionReason: Option[String],
    problemCaseId: Option[String],
    isChangedAddress: Option[Boolean],
    isChangedDeliveryInstruction: Option[Boolean],
    credit: Option[DeliveryProblemCredit],
)
