package com.gu.digital_voucher_cancellation_processor

import java.time.{Clock, LocalDate}

import cats.Monad
import cats.data.EitherT
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.salesforce.SalesforceQueryConstants.formatDate
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._

case class DigitalVoucherCancellationProcessorError(message: String)

object DigitalVoucherCancellationProcessor extends LazyLogging {

  case class DigitalVoucherQueryRecord(Id: String, SF_Subscription__r: SubscriptionQueryRecord)
  case class SubscriptionQueryRecord(Id: String)

  def apply[F[_]: Monad](salesforceClient: SalesforceClient[F], clock: Clock): EitherT[F, DigitalVoucherCancellationProcessorError, Unit] = {
    val today = LocalDate.now(clock)
    for {
      results <- salesforceClient.query[SubscriptionQueryRecord](
        subscrptionsCancelledTodayQuery(today)
      ).leftMap(error => DigitalVoucherCancellationProcessorError(s"Failed to query for cancelled subs: ${error.message}"))
      _ = logger.info(s"Retrieved results for vouchers to be cancelled: ${results}")
    } yield ()
  }

  def subscrptionsCancelledTodayQuery(today: LocalDate): String = {
    s"""
       |SELECT
       |  Id,
       |  SF_Subscription__r.Id
       |FROM
       |  Digital_Voucher__c
       |WHERE SF_Subscription__r.Cancellation_Effective_Date__c <= ${formatDate(today)}

       |""".stripMargin
  }
}
