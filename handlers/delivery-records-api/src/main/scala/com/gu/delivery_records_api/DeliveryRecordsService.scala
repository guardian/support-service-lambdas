package com.gu.delivery_records_api

import java.time.LocalDate

import cats.data.EitherT
import cats.effect.IO
import com.gu.salesforce.sttp.SalesforceClient
import io.circe.generic.auto._

final case class DeliveryRecord(
  key: Option[String],
  deliveryInstruction: Option[String],
  deliveryAddress: Option[String]
)

case class DeliveryRecordServiceError(message: String)

trait DeliveryRecordsService {
  def getDeliveryRecordsForSubscription(subscriptionId: String): EitherT[IO, DeliveryRecordServiceError, List[DeliveryRecord]]
}

object DeliveryRecordsService {
  private case class DeliveryRecordQueryResult(
    Composite_Key__c: Option[String],
    Delivery_Instructions__c: Option[String],
    Delivery_Address__c: Option[String]
  )

  def apply(salesforceClient: SalesforceClient[IO]): DeliveryRecordsService = new DeliveryRecordsService {
    override def getDeliveryRecordsForSubscription(subscriptionId: String): EitherT[IO, DeliveryRecordServiceError, List[DeliveryRecord]] =
      salesforceClient.query[DeliveryRecord](
        s"SELECT ( SELECT Composite_Key__c, Delivery_Instructions__c, Delivery_Address__c FROM Delivery_Records__r ) " +
          "FROM SF_Subscription__c " +
          s"WHERE Name = '$subscriptionId'"
      ).bimap(
        error => DeliveryRecordServiceError(error.toString),
        { queryResult =>
          queryResult.records.map( queryRecord =>
            DeliveryRecord(
              key = queryRecord.key,
              deliveryInstruction = queryRecord.deliveryInstruction,
              deliveryAddress = queryRecord.deliveryAddress
            )
          )
        }
      )
  }
}

