package com.gu.digital_voucher_cancellation_processor

import cats.data.EitherT
import cats.effect.{IO, Sync}
import com.gu.AppIdentity
import com.gu.digital_voucher_cancellation_processor.DigitalVoucherCancellationProcessorService.ImovoCancellationResults
import com.gu.imovo.{ImovoClient, ImovoConfig}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.util.config.ConfigLoader
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import org.asynchttpclient.AsyncHttpClient
import sttp.client3.SttpBackend
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import java.time.Clock
import scala.concurrent.ExecutionContext

case class DigitalVoucherCancellationProcessorAppError(message: String)

case class DigitalVoucherCancellationProcessorConfig(imovo: ImovoConfig, salesforce: SFAuthConfig)

object DigitalVoucherCancellationProcessorApp extends LazyLogging {

  private implicit val contextShift = IO.contextShift(ExecutionContext.global)

  def apply(appIdentity: AppIdentity, httpClient: AsyncHttpClient): EitherT[IO, DigitalVoucherCancellationProcessorAppError, ImovoCancellationResults] = {
    apply(
      appIdentity = appIdentity,
      sttpBackend = AsyncHttpClientCatsBackend.usingClient[IO](httpClient),
      clock = Clock.systemDefaultZone()
    )
  }

  def apply[F[_]: Sync, S](
    appIdentity: AppIdentity,
    sttpBackend: SttpBackend[F, S],
    clock: Clock
  ): EitherT[F, DigitalVoucherCancellationProcessorAppError, ImovoCancellationResults] = {
    for {
      config <- loadConfig(appIdentity)
      salesforceClient <- SalesforceClient(sttpBackend, config.salesforce)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to create salesforce client: ${error.message}"))
      imovoClient <- ImovoClient(sttpBackend, config.imovo)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to create imovo client: ${error.message}"))
      result <- DigitalVoucherCancellationProcessorService(salesforceClient, imovoClient, clock)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to execute cancellation processor: ${error.message}"))
    } yield result
  }

  def loadConfig[F[_]: Sync](
    appIdentity: AppIdentity
  ): EitherT[F, DigitalVoucherCancellationProcessorAppError, DigitalVoucherCancellationProcessorConfig] = {
    for {
      imovoConfig <- ConfigLoader
        .loadConfig[F, ImovoConfig]("support-service-lambdas-shared-imovo", appIdentity)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to load imovo config: ${error.message} "))
      salesforceConfig <- ConfigLoader
        .loadConfig[F, SFAuthConfig]("support-service-lambdas-shared-salesforce", appIdentity)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to load salesforce config: ${error.message} "))
    } yield DigitalVoucherCancellationProcessorConfig(imovoConfig, salesforceConfig)
  }
}
