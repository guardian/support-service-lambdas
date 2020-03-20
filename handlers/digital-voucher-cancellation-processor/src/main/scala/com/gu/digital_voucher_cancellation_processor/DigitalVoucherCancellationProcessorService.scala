package com.gu.digital_voucher_cancellation_processor

import java.time.{Clock, LocalDate}

import cats.Monad
import cats.data.EitherT
import com.gu.imovo.{ImovoClient, ImovoClientException, SfSubscriptionId}
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.salesforce.SalesforceQueryConstants.formatDate
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import cats.implicits._

import scala.collection.immutable

object DigitalVoucherCancellationProcessorService extends LazyLogging {

  private val ImovoSubscriptionDoesNotExistMessage = "no live subscription vouchers exist for the supplied subscription id"
  case class DigitalVoucherQueryResult(Id: String, SF_Subscription__r: SubscriptionQueryResult)
  case class SubscriptionQueryResult(Id: String)
  case class DigitalVoucherCancellationProcessorServiceError(message: String)
  case class ImovoCancellationResults(
    successFullyCancelled: List[DigitalVoucherQueryResult] = Nil,
    alreadyCancelled: List[DigitalVoucherQueryResult] = Nil,
    cancellationFailed: List[ImovoClientException] = Nil
  )

  def apply[F[_]: Monad](salesforceClient: SalesforceClient[F], imovoClient: ImovoClient[F], clock: Clock): EitherT[F, DigitalVoucherCancellationProcessorServiceError, Unit] = {
    val today = LocalDate.now(clock)
    for {
      vouchersToProcess <- salesforceClient.query[DigitalVoucherQueryResult](
        subscrptionsCancelledTodayQuery(today)
      ).leftMap(error => DigitalVoucherCancellationProcessorServiceError(s"Failed to query for cancelled digital vouchers: ${error.message}"))

      _ = processCancellations(imovoClient, vouchersToProcess.records)

      _ = logger.info(s"Retrieved results for vouchers to be cancelled: ${vouchersToProcess}")
    } yield ()
  }

  def processCancellations[F[_]: Monad](
    imovoClient: ImovoClient[F],
    vouchersToCancel: List[DigitalVoucherQueryResult]
  ) = {
    for {
      imovoResults <- cancelSubscriptionsInImovo(vouchersToCancel, imovoClient)
    } yield imovoResults
  }

  private def updateSFCancellationProcessedDate(subscriptionIds: List[String]) = {

  }

  private def cancelSubscriptionsInImovo[F[_]: Monad](
    vouchersToCancel: List[DigitalVoucherQueryResult],
    imovoClient: ImovoClient[F]
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, ImovoCancellationResults] = {
    EitherT.right[DigitalVoucherCancellationProcessorServiceError](
      vouchersToCancel.traverse[F, ImovoCancellationResults] {
        voucherToCancel =>
          imovoClient
            .cancelSubscriptionVoucher(SfSubscriptionId(voucherToCancel.SF_Subscription__r.Id), None)
            .fold(
              {
                case ImovoClientException(message) if message.contains(ImovoSubscriptionDoesNotExistMessage) =>
                  ImovoCancellationResults(alreadyCancelled = List(voucherToCancel))
                case error: ImovoClientException =>
                  ImovoCancellationResults(cancellationFailed = List(error))
              },
              _ => ImovoCancellationResults(successFullyCancelled = List(voucherToCancel))
            )
      }.map { resultList: immutable.Seq[ImovoCancellationResults] =>
        resultList.reduce((r1, r2) =>
          ImovoCancellationResults(
            r1.successFullyCancelled ++ r2.successFullyCancelled,
            r1.alreadyCancelled ++ r2.alreadyCancelled,
            r1.cancellationFailed ++ r2.cancellationFailed
          ))
      }
    )
  }

  def subscrptionsCancelledTodayQuery(today: LocalDate): String = {
    s"""
       |SELECT
       |  Id,
       |  SF_Subscription__r.Id
       |FROM
       |  Digital_Voucher__c
       |WHERE SF_Subscription__r.Cancellation_Effective_Date__c <= ${formatDate(today)}
       |  AND SF_Subscription__r.Cancellation_Processed_At__c = null
       |""".stripMargin
  }
}
