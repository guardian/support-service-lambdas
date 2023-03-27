package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.IO
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.Stage
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import sttp.client3.SttpBackend

import scala.concurrent.ExecutionContext
import org.typelevel.ci.CIString

final case class DeliveryRecordsApiError(message: String)

object DeliveryRecordsApiApp extends LazyLogging {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  def apply(sttpBackend: SttpBackend[IO, Any]): EitherT[IO, DeliveryRecordsApiError, HttpRoutes[IO]] = {
    for {
      config <- loadSalesforceConfig()
      app <- DeliveryRecordsApiApp(config, sttpBackend)
    } yield app
  }

  def apply[S](
      config: SFAuthConfig,
      sttpBackend: SttpBackend[IO, S],
  ): EitherT[IO, DeliveryRecordsApiError, HttpRoutes[IO]] = {
    for {
      salesforceClient <- SalesforceClient(sttpBackend, config)
        .leftMap(error => DeliveryRecordsApiError(error.toString))
    } yield createLogging()(DeliveryRecordApiRoutes(DeliveryRecordsService(salesforceClient)))
  }

  def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CIString => headerKey.toString == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) }),
    )
  }

  private def loadSalesforceConfig(): EitherT[IO, DeliveryRecordsApiError, SFAuthConfig] = {
    ConfigLoader
      .loadFileFromS3[IO, SFAuthConfig](bucket, stage, SFAuthConfig.location)
      .leftMap(error => DeliveryRecordsApiError(error.toString))
  }

  private lazy val stage: Stage =
    Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))

  private val bucket = "gu-reader-revenue-private"
}
