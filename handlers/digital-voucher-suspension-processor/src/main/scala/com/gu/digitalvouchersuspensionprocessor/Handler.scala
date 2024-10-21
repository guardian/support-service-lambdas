package com.gu.digitalvouchersuspensionprocessor

import cats.data.EitherT
import cats.effect.{IO, Sync}
import cats.syntax.all._
import com.gu.digitalvouchersuspensionprocessor.Salesforce.Suspension
import com.gu.imovo.ImovoClient
import com.gu.salesforce.sttp.SalesforceClient
import com.typesafe.scalalogging.LazyLogging
import sttp.client3.SttpBackend
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import java.time.LocalDateTime
import scala.concurrent.ExecutionContext

object Handler extends LazyLogging {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  // lambda entry point
  def handleRequest(): Unit = processSuspensions()

  def main(args: Array[String]): Unit = processSuspensions()

  def processSuspensions(): Unit = {

    def processed(sttpBackend: SttpBackend[IO, Any]) = for {
      config <- EitherT.fromEither[IO].apply(Config.get()).leftWiden[Failure]
      salesforce <- SalesforceClient(sttpBackend, config.salesforce)
        .leftMap(e => SalesforceFetchFailure(s"Failed to create Salesforce client: $e"))
      imovo <- ImovoClient(sttpBackend, config.imovo)
        .leftMap(e => DigitalVoucherSuspendFailure(s"Failed to create Imovo client: $e"))
      suspensions <- fetchSuspensionsToBeProcessed(salesforce).leftWiden[Failure]
      suspensionResults <- EitherT.right[Failure].apply(
        suspensions.traverse(suspension =>
          sendSuspensionToDigitalVoucherApi(salesforce, imovo, LocalDateTime.now)(suspension).value
        )
      )
      maybeFailures = suspensionResults.collect { case Left(failure) => failure } match {
        case Nil => None
        case failures => Some[Failure](CompositeFailure(failures))
      }
      _ <- EitherT.fromEither[IO].apply(maybeFailures.toLeft(()))
    } yield ()

    AsyncHttpClientCatsBackend[IO]()
      .flatMap { sttpBackend =>
        processed(sttpBackend).value
      }
      .unsafeRunSync()
      .valueOr { e =>
        logger.error(s"Processing failed: $e")
        throw new RuntimeException(e.toString)
      }
  }

  def fetchSuspensionsToBeProcessed[F[_]: Sync](
      salesforce: SalesforceClient[F],
  ): EitherT[F, SalesforceFetchFailure, List[Suspension]] =
    Salesforce.fetchSuspensions(salesforce).map(_.records).map { suspensions =>
      logger.info(s"${suspensions.length} suspensions to be processed")
      suspensions.foreach(suspension => logger.info(s"To be processed: $suspension"))
      suspensions
    }

  def sendSuspensionToDigitalVoucherApi[F[_]: Sync](
      salesforce: SalesforceClient[F],
      imovo: ImovoClient[F],
      now: LocalDateTime,
  )(suspension: Suspension): EitherT[F, Failure, Unit] =
    (for {
      _ <- DigitalVoucher.suspend(imovo, suspension).leftWiden[Failure]
      _ <- Salesforce.writeSuccess(salesforce, suspension, now).leftWiden[Failure]
    } yield ()).bimap(
      { e =>
        logger.error(s"Failed to process $suspension: $e")
        e
      },
      { _ =>
        logger.info(s"Successfully processed $suspension")
        ()
      },
    )
}
