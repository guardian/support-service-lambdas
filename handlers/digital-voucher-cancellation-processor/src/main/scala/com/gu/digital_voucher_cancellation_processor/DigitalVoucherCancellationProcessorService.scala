package com.gu.digital_voucher_cancellation_processor

import java.time.{Clock, Instant, LocalDate}

import cats.{Monad, Show}
import cats.data.{EitherT, NonEmptyList}
import com.gu.imovo.{ImovoClient, ImovoClientException, SfSubscriptionId}
import com.gu.salesforce.sttp.{SFApiCompositePart, SFApiCompositeRequest, SalesforceClient}
import com.gu.salesforce.SalesforceQueryConstants.formatDate
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import cats.implicits._

import scala.collection.immutable

object DigitalVoucherCancellationProcessorService extends LazyLogging {

  private val ImovoSubscriptionDoesNotExistMessage = "no live subscription vouchers exist for the supplied subscription id"
  case class CObjectAttribues(url: String)
  case class DigitalVoucherQueryResult(Id: String, attributes: CObjectAttribues, SF_Subscription__r: SubscriptionQueryResult)
  case class DigitalVoucherUpdate(Cancellation_Processed_At__c: Instant)
  case class SubscriptionQueryResult(Id: String, attributes: CObjectAttribues)
  case class DigitalVoucherCancellationProcessorServiceError(message: String)
  case class ImovoCancellationResults(
    successfullyCancelled: List[DigitalVoucherQueryResult] = Nil,
    alreadyCancelled: List[DigitalVoucherQueryResult] = Nil,
    cancellationFailures: List[ImovoClientException] = Nil
  )

  object ImovoCancellationResults {
    implicit val show = {
      implicit val resultShow = Show.show[DigitalVoucherQueryResult](result =>
        s"subscriptionId=${result.SF_Subscription__r.Id}")
      Show.show[ImovoCancellationResults](results =>
        s"""
           |ImovoCancellationResults(
           |  successfullyCancelled=[${results.successfullyCancelled.map(_.show).mkString(",")}]
           |  alreadyCancelled=[${results.alreadyCancelled.map(_.show).mkString(",")}]
           |  cancellationFailures=[${results.cancellationFailures.mkString(",")}]
           |)
           |""".stripMargin)
    }
  }

  def apply[F[_]: Monad](
    salesforceClient: SalesforceClient[F],
    imovoClient: ImovoClient[F],
    clock: Clock
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, ImovoCancellationResults] = {
    val today = LocalDate.now(clock)
    for {
      vouchersToProcess <- salesforceClient.query[DigitalVoucherQueryResult](
        subscrptionsCancelledTodayQuery(today)
      ).leftMap(error => DigitalVoucherCancellationProcessorServiceError(s"Failed to query for cancelled digital vouchers: ${error.message}"))
      results <- processCancellations(imovoClient, salesforceClient, vouchersToProcess.records, clock)
    } yield results
  }

  def processCancellations[F[_]: Monad](
    imovoClient: ImovoClient[F],
    salesforceClient: SalesforceClient[F],
    vouchersToCancel: List[DigitalVoucherQueryResult],
    clock: Clock
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, ImovoCancellationResults] = {
    for {
      imovoResults <- cancelSubscriptionsInImovo(vouchersToCancel, imovoClient)
      _ <- updateSFCancellationProcessedDate(imovoResults, salesforceClient, clock)
    } yield imovoResults
  }

  private def updateSFCancellationProcessedDate[F[_]: Monad](
    imovoCancellationResults: ImovoCancellationResults,
    salesforceClient: SalesforceClient[F],
    clock: Clock
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, Unit] = {
    val now = clock.instant()

    val optionalSucessfullyProcessedVouchers = NonEmptyList.fromList(
      imovoCancellationResults.successfullyCancelled ++ imovoCancellationResults.alreadyCancelled
    )

    optionalSucessfullyProcessedVouchers
      .fold(EitherT.rightT[F, DigitalVoucherCancellationProcessorServiceError](())) { sucessfullyProcessedVouchers =>
        salesforceClient.composite(
          SFApiCompositeRequest(
            true,
            false,
            sucessfullyProcessedVouchers
              .toList
              .map(voucherToMarkAsProcessed => {
                SFApiCompositePart(
                  voucherToMarkAsProcessed.Id,
                  "PATCH",
                  voucherToMarkAsProcessed.attributes.url,
                  DigitalVoucherUpdate(now)
                )
              })
          )
        ).bimap(
            { salesforceError =>
              DigitalVoucherCancellationProcessorServiceError(
                s"Failed to write changes to salesforce:${salesforceError} however the following updates were made in " +
                  s"imovo ${imovoCancellationResults.show} "
              )
            },
            _ => ()
          )
      }
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
                  ImovoCancellationResults(cancellationFailures = List(error))
              },
              _ => ImovoCancellationResults(successfullyCancelled = List(voucherToCancel))
            )
      }.map { resultList: immutable.Seq[ImovoCancellationResults] =>
        resultList.foldLeft(ImovoCancellationResults()) { (r1: ImovoCancellationResults, r2: ImovoCancellationResults) =>
          ImovoCancellationResults(
            r1.successfullyCancelled ++ r2.successfullyCancelled,
            r1.alreadyCancelled ++ r2.alreadyCancelled,
            r1.cancellationFailures ++ r2.cancellationFailures
          )
        }
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
       |  AND Cancellation_Processed_At__c = null
       |""".stripMargin
  }
}
