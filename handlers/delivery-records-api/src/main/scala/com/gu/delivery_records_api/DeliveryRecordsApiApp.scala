package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.IO
import com.gu.salesforce.SFAuthConfig
import com.gu.util.config.{ConfigLocation, Stage}
import com.typesafe.scalalogging.LazyLogging
import org.http4s.HttpRoutes
import io.circe.generic.auto._

final case class DeliveryRecordsApiAppError(message: String)

object DeliveryRecordsApiApp extends LazyLogging {
  def apply(): EitherT[IO, DeliveryRecordsApiAppError, HttpRoutes[IO]] = {
    for {
      config <- loadSalesforceConfig()
      _ = logger.info(s"Loaded config sf url: ${config.url}")
    } yield DeliveryRecordApiRoutes(DeliveryRecordsService())
  }

  private def loadSalesforceConfig(): EitherT[IO, DeliveryRecordsApiAppError, SFAuthConfig] = {
    ConfigLoader
      .loadFileFromS3[SFAuthConfig](bucket, stage, salesforceConfigLocation)
      .leftMap(error => DeliveryRecordsApiAppError(error.toString()))
  }

  private lazy val stage: Stage =
    Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("DEV"))

  private val bucket = "gu-reader-revenue-private"

  private val salesforceConfigLocation = ConfigLocation[SFAuthConfig]("sfAuth", 1)
}
