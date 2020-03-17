package com.gu.digital_voucher_cancellation_processor

import java.time.Clock

import cats.arrow.FunctionK
import cats.data.EitherT
import cats.effect.{IO, Sync}
import com.gu.AppIdentity
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.ConfigLoader
import com.softwaremill.sttp.{HttpURLConnectionBackend, Id, SttpBackend}
import io.circe.generic.auto._
import com.softwaremill.sttp.impl.cats.implicits._

case class DigitalVoucherCancellationProcessorAppError(message: String)

case class DigitalVoucherCancellationProcessorConfig(salesforceConfig: SFAuthConfig)

object DigitalVoucherCancellationProcessorApp {
  def apply(appIdentity: AppIdentity): EitherT[IO, DigitalVoucherCancellationProcessorAppError, Unit] = {
    apply(appIdentity, urlConnectionSttpBackend(), Clock.systemDefaultZone())
  }

  def apply[F[_]: Sync, S](appIdentity: AppIdentity, sttpBackend: SttpBackend[F, S], clock: Clock): EitherT[F, DigitalVoucherCancellationProcessorAppError, Unit] = {
    for {
      config <- ConfigLoader
        .loadConfig[F, DigitalVoucherCancellationProcessorConfig](appIdentity)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to load config: ${error.message}"))
      salesforceClient <- SalesforceClient(sttpBackend, config.salesforceConfig)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to create salesforce client: ${error.message}"))
      result <- DigitalVoucherCancellationProcessor(salesforceClient, clock)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to execute cancellation processor: ${error.message}"))
    } yield result
  }

  private def urlConnectionSttpBackend(): SttpBackend[IO, Nothing] =
    sttpBackendToCatsMappableSttpBackend[Id, Nothing](HttpURLConnectionBackend())
      .mapK(FunctionK.lift[Id, IO](IO.delay))
}
