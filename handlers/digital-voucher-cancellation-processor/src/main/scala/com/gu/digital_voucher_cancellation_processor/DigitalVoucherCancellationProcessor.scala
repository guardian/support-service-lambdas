package com.gu.digital_voucher_cancellation_processor

import cats.Monad
import cats.data.EitherT
import com.gu.salesforce.sttp.SalesforceClient
import cats.implicits._

case class DigitalVoucherCancellationProcessorError(message: String)

object DigitalVoucherCancellationProcessor {
  def apply[F[_]: Monad](salesforceClient: SalesforceClient[F]):  EitherT[F, DigitalVoucherCancellationProcessorError, Unit] = {
    ().asRight[DigitalVoucherCancellationProcessorError].toEitherT[F]
  }
}
