package com.gu.digital_voucher_cancellation_processor

import java.time.Clock

import cats.Monad
import cats.arrow.FunctionK
import cats.data.EitherT
import cats.effect.{IO, Sync}
import com.gu.AppIdentity
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.ConfigLoader
import com.softwaremill.sttp.{HttpURLConnectionBackend, Id, SttpBackend}
import io.circe.generic.auto._
import com.typesafe.scalalogging.LazyLogging

case class DigitalVoucherCancellationProcessorAppError(message: String)

case class ImovoConfig(imovoBaseUrl: String, imovoApiKey: String)
case class DigitalVoucherCancellationProcessorConfig(imovo: ImovoConfig, salesforce: SFAuthConfig)

object DigitalVoucherCancellationProcessorApp extends LazyLogging {

  def apply(appIdentity: AppIdentity): EitherT[IO, DigitalVoucherCancellationProcessorAppError, Unit] = {
    apply(appIdentity, urlConnectionSttpBackend(), Clock.systemDefaultZone())
  }

  def apply[F[_]: Sync, S](appIdentity: AppIdentity, sttpBackend: SttpBackend[F, S], clock: Clock): EitherT[F, DigitalVoucherCancellationProcessorAppError, Unit] = {
    for {
      config <- loadConfig(appIdentity)
      salesforceClient <- SalesforceClient(sttpBackend, config.salesforce)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to create salesforce client: ${error.message}"))
      result <- DigitalVoucherCancellationProcessorService(salesforceClient, clock)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to execute cancellation processor: ${error.message}"))
    } yield result
  }

  def loadConfig[F[_]: Sync: Monad](appIdentity: AppIdentity): EitherT[F, DigitalVoucherCancellationProcessorAppError, DigitalVoucherCancellationProcessorConfig] = {
    for {
      imovoConfig <- ConfigLoader
        .loadConfig[F, ImovoConfig]("support-service-lambdas-shared-imovo", appIdentity)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to load imovo config: ${error.message} "))
      salesforceConfig <- ConfigLoader
        .loadConfig[F, SFAuthConfig]("support-service-lambdas-shared-salesforce", appIdentity)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to load salesforce config: ${error.message} "))
    } yield DigitalVoucherCancellationProcessorConfig(imovoConfig, salesforceConfig)
  }

  private def urlConnectionSttpBackend(): SttpBackend[IO, Nothing] = {
    import com.softwaremill.sttp.impl.cats.implicits._

    sttpBackendToCatsMappableSttpBackend[Id, Nothing](HttpURLConnectionBackend())
        .mapK(FunctionK.lift[Id, IO](IO.delay))
  }
}
