package com.gu.digitalvouchersuspensionprocessor

import java.time.{LocalDate, LocalDateTime}

import cats.data.EitherT
import cats.effect.Sync
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.sttp.SalesforceClient
import io.circe.generic.auto._

object Salesforce {

  case class Suspension(
      Id: String,
      Stopped_Publication_Date__c: LocalDate,
      Holiday_Stop_Request__r: HolidayStopRequest,
  )

  /** @param SF_Subscription__c
    *   SF subscription ID
    * @param Subscription_Name__c
    *   Zuora subscription name/number
    */
  case class HolidayStopRequest(
      SF_Subscription__c: String,
      Subscription_Name__c: String,
  )

  case class Patch(Sent_To_Digital_Voucher_Service__c: LocalDateTime)

  def fetchSuspensions[F[_]: Sync](
      salesforce: SalesforceClient[F],
  ): EitherT[F, SalesforceFetchFailure, RecordsWrapperCaseClass[Suspension]] =
    salesforce
      .query[Suspension](query.futureSuspendedVouchers)
      .leftMap(e => SalesforceFetchFailure(e.toString))

  def writeSuccess[F[_]: Sync](
      salesforce: SalesforceClient[F],
      suspension: Suspension,
      now: LocalDateTime,
  ): EitherT[F, SalesforceWriteFailure, Unit] =
    salesforce
      .patch(
        objectName = "Holiday_Stop_Requests_Detail__c",
        objectId = suspension.Id,
        body = Patch(Sent_To_Digital_Voucher_Service__c = now),
      )
      .leftMap(e => SalesforceWriteFailure(e.toString))

  object query {
    val futureSuspendedVouchers: String =
      s"""
         |SELECT Id, Holiday_Stop_Request__r.SF_Subscription__c, Stopped_Publication_Date__c, Holiday_Stop_Request__r.Subscription_Name__c
         |FROM Holiday_Stop_Requests_Detail__c
         |WHERE Holiday_Stop_Request__r.SF_Subscription__r.Product_Type__c = 'Newspaper - Digital Voucher'
         |AND Stopped_Publication_Date__c >= TOMORROW
         |AND Is_Withdrawn__c = false
         |AND Is_Actioned__c = true
         |AND Sent_To_Digital_Voucher_Service__c = null
         |""".stripMargin
  }
}
