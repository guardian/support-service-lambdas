package com.gu.digital_voucher_cancellation_processor

import cats.data.EitherT
import cats.effect.IO
import com.gu.AppIdentity
import com.gu.util.config.ConfigLoader
import io.circe.generic.auto._

case class DigitalVoucherCancellationProcessorAppError(message: String)

case class DigitalVoucherCancellationProcessorConfig()

object DigitalVoucherCancellationProcessorApp {
  def apply(appIdentity: AppIdentity): EitherT[IO, DigitalVoucherCancellationProcessorAppError, Unit] = {
    for {
      config <- ConfigLoader
        .loadConfig[IO, DigitalVoucherCancellationProcessorConfig](appIdentity)
        .leftMap(error => DigitalVoucherCancellationProcessorAppError(s"Failed to load config: ${error.message}"))
    } yield ()
  }
}
