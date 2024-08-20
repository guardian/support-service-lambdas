package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.{ContextShift, IO}
import com.gu.delivery_records_api.service.createproblem.CreateDeliveryProblemServiceImpl
import com.gu.delivery_records_api.service.getrecords.GetDeliveryRecordsServiceImpl
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.Stage
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.http4s.HttpRoutes
import org.http4s.server.middleware.Logger
import org.typelevel.ci.CIString
import sttp.client3.SttpBackend

import scala.concurrent.ExecutionContext

final case class DeliveryRecordsApiError(message: String)

object DeliveryRecordsApiApp extends LazyLogging {

  private implicit val contextShift: ContextShift[IO] = IO.contextShift(ExecutionContext.global)

  def buildHttpRoutes(sttpBackend: SttpBackend[IO, Any]): EitherT[IO, DeliveryRecordsApiError, HttpRoutes[IO]] =
    for {
      config <- loadSalesforceConfig()
      app <- DeliveryRecordsApiApp.httpRoutesFromConfig(config, sttpBackend)
    } yield app

  def httpRoutesFromConfig[S](
      config: SFAuthConfig,
      sttpBackend: SttpBackend[IO, S],
  ): EitherT[IO, DeliveryRecordsApiError, HttpRoutes[IO]] =
    for {
      salesforceClient <- SalesforceClient(sttpBackend, config)
        .leftMap(error => DeliveryRecordsApiError(error.toString))
    } yield {
      val create = new CreateDeliveryProblemServiceImpl(salesforceClient)
      val get = new GetDeliveryRecordsServiceImpl(salesforceClient)
      val routes = new DeliveryRecordApiRoutes(create, get).routes
      addRequestLogging(routes)
    }

  private def addRequestLogging(routes: HttpRoutes[IO]): HttpRoutes[IO] =
    Logger.httpRoutes(
      logHeaders = true,
      logBody = true,
      redactHeadersWhen = { headerKey: CIString => headerKey.toString == "x-api-key" },
      logAction = Some({ message: String => IO.delay(logger.info(message)) }),
    )(routes)

  private def loadSalesforceConfig(): EitherT[IO, DeliveryRecordsApiError, SFAuthConfig] = {
    ConfigLoader
      .loadFileFromS3[IO, SFAuthConfig](bucket, stage, SFAuthConfig.location)
      .leftMap(error => DeliveryRecordsApiError(error.toString))
  }

  private lazy val stage: Stage =
    Stage(Option(System.getenv("Stage")).filter(_ != "").getOrElse("CODE"))

  private val bucket = "gu-reader-revenue-private"
}
