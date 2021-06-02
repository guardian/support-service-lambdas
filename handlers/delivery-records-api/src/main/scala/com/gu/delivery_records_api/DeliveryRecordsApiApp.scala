package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.IO
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.Stage
import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp.asynchttpclient.cats.AsyncHttpClientCatsBackend
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import io.circe.generic.auto._
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString

final case class DeliveryRecordsApiError(message: String)

object DeliveryRecordsApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(): EitherT[IO, DeliveryRecordsApiError, HttpRoutes[IO]] = {
    for {
      config <- loadSalesforceConfig()
      app <- DeliveryRecordsApiApp(config, AsyncHttpClientCatsBackend[cats.effect.IO]())
    } yield app
  }

  def apply[S](config: SFAuthConfig, sttpBackend: SttpBackend[IO, S]): EitherT[IO, DeliveryRecordsApiError, HttpRoutes[IO]] = {
    for {
      salesforceClient <- SalesforceClient(sttpBackend, config)
        .leftMap(error => DeliveryRecordsApiError(error.toString))
    } yield createLogging()(DeliveryRecordApiRoutes(DeliveryRecordsService(salesforceClient)))
  }

  def createLogging(): HttpRoutes[IO] => HttpRoutes[IO] = {
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CaseInsensitiveString => headerKey.value == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) })
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
