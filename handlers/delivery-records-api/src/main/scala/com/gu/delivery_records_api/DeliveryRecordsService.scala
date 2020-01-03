package com.gu.delivery_records_api

import java.time.LocalDate

import cats.Monad
import cats.data.EitherT
import com.gu.salesforce.{Contact, RecordsWrapperCaseClass, SFApiDeliveryRecord}
import com.gu.salesforce.SalesforceQueryConstants.deliveryRecordsQuery
import com.gu.salesforce.sttp.SalesforceClient
import io.circe.generic.auto._
import cats.implicits._

final case class DeliveryRecord(
  deliveryDate: Option[LocalDate],
  deliveryInstruction: Option[String],
  deliveryAddress: Option[String],
  addressLine1: Option[String],
  addressLine2: Option[String],
  addressLine3: Option[String],
  addressTown: Option[String],
  addressCountry: Option[String],
  addressPostcode: Option[String],
  hasHolidayStop: Option[Boolean]

)

sealed trait DeliveryRecordServiceError

case class DeliveryRecordServiceGenericError(message: String) extends DeliveryRecordServiceError

case class DeliveryRecordServiceSubscriptionNotFound(message: String) extends DeliveryRecordServiceError

trait DeliveryRecordsService[F[_]] {
  def getDeliveryRecordsForSubscription(
    subscriptionId: String,
    contact: Contact,
    optionalStartDate: Option[LocalDate],
    optionalEndDate: Option[LocalDate]
  ): EitherT[F, DeliveryRecordServiceError, List[DeliveryRecord]]
}

object DeliveryRecordsService {

  private case class SubscriptionRecordQueryResult(
    Delivery_Records__r: Option[RecordsWrapperCaseClass[SFApiDeliveryRecord]]
  )

  def apply[F[_]: Monad](salesforceClient: SalesforceClient[F]): DeliveryRecordsService[F] = new DeliveryRecordsService[F] {
    override def getDeliveryRecordsForSubscription(
      subscriptionId: String,
      contact: Contact,
      optionalStartDate: Option[LocalDate],
      optionalEndDate: Option[LocalDate]
    ): EitherT[F, DeliveryRecordServiceError, List[DeliveryRecord]] =
      for {
        queryResult <- queryForDeliveryRecords(
          salesforceClient,
          subscriptionId,
          contact,
          optionalStartDate,
          optionalEndDate
        )
        records <- getDeliveryRecordsFromQueryResults(subscriptionId, contact, queryResult).toEitherT[F]
        results = records.map { queryRecord =>
          DeliveryRecord(
            deliveryDate = queryRecord.Delivery_Date__c,
            deliveryAddress = queryRecord.Delivery_Address__c,
            addressLine1 = queryRecord.Address_Line_1__c,
            addressLine2 = queryRecord.Address_Line_2__c,
            addressLine3 = queryRecord.Address_Line_3__c,
            addressTown = queryRecord.Address_Town__c,
            addressCountry = queryRecord.Address_Country__c,
            addressPostcode = queryRecord.Address_Postcode__c,
            deliveryInstruction = queryRecord.Delivery_Instructions__c,
            hasHolidayStop = queryRecord.Has_Holiday_Stop__c
          )
        }
      } yield results

    private def queryForDeliveryRecords(
      salesforceClient: SalesforceClient[F],
      subscriptionId: String,
      contact: Contact,
      optionalStartDate: Option[LocalDate],
      optionalEndDate: Option[LocalDate]
    ): EitherT[F, DeliveryRecordServiceError, RecordsWrapperCaseClass[SubscriptionRecordQueryResult]] = {
      salesforceClient.query[SubscriptionRecordQueryResult](
        deliveryRecordsQuery(contact, subscriptionId, optionalStartDate, optionalEndDate)
      )
        .leftMap(error => DeliveryRecordServiceGenericError(error.toString))
    }

    private def getDeliveryRecordsFromQueryResults(
      subscriptionId: String,
      contact: Contact,
      queryResult: RecordsWrapperCaseClass[SubscriptionRecordQueryResult]
    ): Either[DeliveryRecordServiceError, List[SFApiDeliveryRecord]] = {
      queryResult
        .records
        .headOption
        .toRight(
          DeliveryRecordServiceSubscriptionNotFound(
            s"Subscription '$subscriptionId' not found or did not belong to contact " +
              s"'${contact}'"
          )
        )
        .map(deliverRecordsOption => deliverRecordsOption.Delivery_Records__r.map(_.records).getOrElse(Nil))
    }
  }
}

