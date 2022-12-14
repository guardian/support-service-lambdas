package com.gu.digital_voucher_cancellation_processor

import java.time.{Clock, Instant, LocalDate}

import cats.data.{EitherT, NonEmptyList}
import cats.syntax.all._
import cats.{Monad, Show}
import com.gu.imovo.{ImovoClient, ImovoClientException, SfSubscriptionId}
import com.gu.salesforce.sttp.{SFApiCompositePart, SFApiCompositeRequest, SalesforceClient}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._

import scala.collection.immutable

object DigitalVoucherCancellationProcessorService extends LazyLogging {

  private val ImovoSubscriptionDoesNotExistMessage =
    "no live subscription vouchers exist for the supplied subscription id"
  case class CObjectAttribues(url: String)
  case class DigitalVoucherQueryResult(
      Id: String,
      attributes: CObjectAttribues,
      SF_Subscription__r: SubscriptionQueryResult,
  )
  case class DigitalVoucherUpdate(Cancellation_Processed_At__c: Instant, Status__c: String)
  case class SubscriptionQueryResult(Id: String, attributes: CObjectAttribues)
  case class DigitalVoucherCancellationProcessorServiceError(message: String)
  case class ImovoCancellationResults(
      successfullyCancelled: List[DigitalVoucherQueryResult] = Nil,
      alreadyCancelled: List[DigitalVoucherQueryResult] = Nil,
      cancellationFailures: List[ImovoClientException] = Nil,
  )

  object ImovoCancellationResults {
    implicit val show: Show[ImovoCancellationResults] = {
      implicit val resultShow: Show[DigitalVoucherQueryResult] =
        Show.show[DigitalVoucherQueryResult](result => s"subscriptionId=${result.SF_Subscription__r.Id}")
      Show.show[ImovoCancellationResults](results => s"""
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
      clock: Clock,
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, ImovoCancellationResults] =
    for {
      vouchersToProcess <- salesforceClient
        .query[DigitalVoucherQueryResult](
          subscriptionsCancelledTodayQuery,
        )
        .leftMap(error =>
          DigitalVoucherCancellationProcessorServiceError(
            s"Failed to query for cancelled digital vouchers: ${error.message}",
          ),
        )
      results <- processCancellations(imovoClient, salesforceClient, vouchersToProcess.records, clock)
    } yield results

  def processCancellations[F[_]: Monad](
      imovoClient: ImovoClient[F],
      salesforceClient: SalesforceClient[F],
      vouchersToCancel: List[DigitalVoucherQueryResult],
      clock: Clock,
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, ImovoCancellationResults] = {
    for {
      imovoResults <- cancelSubscriptionsInImovo[F](vouchersToCancel, imovoClient)
      _ <- updateSFCancellationProcessedDate[F](imovoResults, salesforceClient, clock)
      _ <- failProcessorRunIfSubscriptionsWereAlreadyCancelled[F](imovoResults)
    } yield imovoResults
  }

  private def updateSFCancellationProcessedDate[F[_]: Monad](
      imovoCancellationResults: ImovoCancellationResults,
      salesforceClient: SalesforceClient[F],
      clock: Clock,
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, Unit] = {
    val now = clock.instant()

    val optionalSucessfullyProcessedVouchers = NonEmptyList.fromList(
      imovoCancellationResults.successfullyCancelled ++ imovoCancellationResults.alreadyCancelled,
    )

    optionalSucessfullyProcessedVouchers
      .fold(EitherT.rightT[F, DigitalVoucherCancellationProcessorServiceError](())) { sucessfullyProcessedVouchers =>
        salesforceClient
          .composite(
            SFApiCompositeRequest(
              allOrNone = true,
              collateSubrequests = false,
              sucessfullyProcessedVouchers.toList
                .map(voucherToMarkAsProcessed => {
                  SFApiCompositePart(
                    voucherToMarkAsProcessed.Id,
                    "PATCH",
                    voucherToMarkAsProcessed.attributes.url,
                    DigitalVoucherUpdate(now, "Deactivated"),
                  )
                }),
            ),
          )
          .bimap(
            { salesforceError =>
              DigitalVoucherCancellationProcessorServiceError(
                s"Failed to write changes to salesforce:${salesforceError} however the following updates were made in " +
                  s"imovo ${imovoCancellationResults.show} ",
              )
            },
            _ => (),
          )
      }
  }

  private def cancelSubscriptionsInImovo[F[_]: Monad](
      vouchersToCancel: List[DigitalVoucherQueryResult],
      imovoClient: ImovoClient[F],
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, ImovoCancellationResults] = {
    EitherT.right[DigitalVoucherCancellationProcessorServiceError](
      vouchersToCancel
        .traverse[F, ImovoCancellationResults] { voucherToCancel =>
          imovoClient
            .cancelSubscriptionVoucher(SfSubscriptionId(voucherToCancel.SF_Subscription__r.Id), None)
            .fold(
              {
                case ImovoClientException(message, _) if message.contains(ImovoSubscriptionDoesNotExistMessage) =>
                  ImovoCancellationResults(alreadyCancelled = List(voucherToCancel))
                case error: ImovoClientException =>
                  ImovoCancellationResults(cancellationFailures = List(error))
              },
              _ => ImovoCancellationResults(successfullyCancelled = List(voucherToCancel)),
            )
        }
        .map { resultList: immutable.Seq[ImovoCancellationResults] =>
          resultList.foldLeft(ImovoCancellationResults()) {
            (r1: ImovoCancellationResults, r2: ImovoCancellationResults) =>
              ImovoCancellationResults(
                r1.successfullyCancelled ++ r2.successfullyCancelled,
                r1.alreadyCancelled ++ r2.alreadyCancelled,
                r1.cancellationFailures ++ r2.cancellationFailures,
              )
          }
        },
    )
  }

  val subscriptionsCancelledTodayQuery: String = {
    // Limit is because a Salesforce composite response cannot contain more than 25 operations
    s"""
       |SELECT
       |  Id,
       |  SF_Subscription__r.Id
       |FROM
       |  Digital_Voucher__c
       |WHERE SF_Subscription__r.Cancellation_Effective_Date__c <= TODAY
       |AND Cancellation_Processed_At__c = null
       |ORDER BY SF_Subscription__r.Cancellation_Effective_Date__c
       |LIMIT 25
       |""".stripMargin
  }

  def failProcessorRunIfSubscriptionsWereAlreadyCancelled[F[_]: Monad](
      imovoCancellationResults: ImovoCancellationResults,
  ): EitherT[F, DigitalVoucherCancellationProcessorServiceError, Unit] = {
    if (imovoCancellationResults.alreadyCancelled.isEmpty)
      EitherT.rightT[F, DigitalVoucherCancellationProcessorServiceError](())
    else
      EitherT.leftT[F, Unit](
        DigitalVoucherCancellationProcessorServiceError(
          s"Some digital vouchers did not exist in imovo, they may have already been cancelled. " +
            s"${imovoCancellationResults.show}",
        ),
      )
  }
}
