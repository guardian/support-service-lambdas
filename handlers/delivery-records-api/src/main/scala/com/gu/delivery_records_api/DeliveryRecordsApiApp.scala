package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.{ConfigLocation, Stage}
import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp.asynchttpclient.cats.AsyncHttpClientCatsBackend
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import io.circe.generic.auto._
import org.http4s.server.middleware.Logger
import org.http4s.util.CaseInsensitiveString

final case class DeliveryRecordsApiAppError(message: String)

object DeliveryRecordsApiApp extends LazyLogging {

  private implicit val cs: ContextShift[IO] = IO.contextShift(scala.concurrent.ExecutionContext.global)

  def apply(): EitherT[IO, DeliveryRecordsApiAppError, HttpRoutes[IO]] = {
    for {
      config <- loadSalesforceConfig()
      app <- DeliveryRecordsApiApp(config, AsyncHttpClientCatsBackend[cats.effect.IO]())
    } yield app
  }

  def apply[S](config: SFAuthConfig, sttpBackend: SttpBackend[IO, S]): EitherT[IO, DeliveryRecordsApiAppError, HttpRoutes[IO]] = {
    for {
      salesforceClient <- SalesforceClient(sttpBackend, config)
        .leftMap(error => DeliveryRecordsApiAppError(error.toString))
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

  private def loadSalesforceConfig(): EitherT[IO, DeliveryRecordsApiAppError, SFAuthConfig] = {
    ConfigLoader
      .loadFileFromS3[IO, SFAuthConfig](bucket, stage, salesforceConfigLocation)
      .leftMap(error => DeliveryRecordsApiAppError(error.toString()))
  }

  private lazy val stage: Stage =
    Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))

  private val bucket = "gu-reader-revenue-private"

  private val salesforceConfigLocation = ConfigLocation[SFAuthConfig]("sfAuth", 1)
}
