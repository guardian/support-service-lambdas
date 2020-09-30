package com.gu.digitalvouchersuspensionprocessor

import java.time.LocalDate

import cats.data.EitherT
import cats.effect.IO
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig}
import com.softwaremill.sttp.SttpBackend
import io.circe.Decoder

object Salesforce {

  case class Suspension(
    subscriptionNumber: String,
    sfSubscriptionId: String,
    suspendedPublicationDate: LocalDate
  )

  object Suspension {
    implicit val decoder: Decoder[Suspension] = cursor => {
      val holStopCursor = cursor.downField("Holiday_Stop_Request__r")
      for {
        subscriptionNumber <- holStopCursor.downField("Subscription_Name__c").as[String]
        sfSubscriptionId <- holStopCursor.downField("SF_Subscription__c").as[String]
        suspendedPublicationDate <- cursor.downField("Stopped_Publication_Date__c").as[LocalDate]
      } yield Suspension(
        subscriptionNumber,
        sfSubscriptionId,
        suspendedPublicationDate
      )
    }
  }

  def fetchSuspensions(config: SFAuthConfig, sttpBackend: SttpBackend[IO, Nothing]): EitherT[IO, SalesforceFetchFailure, RecordsWrapperCaseClass[Suspension]] =
    for {
      salesforceClient <- SalesforceClient(sttpBackend, config)
        .leftMap(e => SalesforceFetchFailure(s"Failed to create Salesforce client: $e"))
      suspensions <- salesforceClient.query[Suspension](query.futureSuspendedVouchers)
        .leftMap(e => SalesforceFetchFailure(s"Failed to fetch results: $e"))
    } yield suspensions

  object query {
    val futureSuspendedVouchers: String =
      s"""
         |SELECT Holiday_Stop_Request__r.SF_Subscription__c, Stopped_Publication_Date__c, Holiday_Stop_Request__r.Subscription_Name__c
         |FROM Holiday_Stop_Requests_Detail__c
         |WHERE Holiday_Stop_Request__r.SF_Subscription__r.Product__c = 'Newspaper Digital Voucher'
         |AND Stopped_Publication_Date__c >= TODAY
         |AND Is_Withdrawn__c = false
         |AND Is_Actioned__c = true
         |AND Sent_To_Digital_Voucher_Service__c = null
         |""".stripMargin
  }
}
