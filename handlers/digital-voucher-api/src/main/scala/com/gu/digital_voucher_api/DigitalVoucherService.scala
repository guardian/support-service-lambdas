package com.gu.digital_voucher_api

import cats.Monad
import cats.data.EitherT
sealed trait DigitalVoucherServiceError

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def createVoucherForSubscription(subscriptionId: String, ratePlanName: String): EitherT[F, DigitalVoucherServiceError, Voucher]
}

object DigitalVoucherService {
  def apply[F[_]: Monad](): DigitalVoucherService[F] = new DigitalVoucherService[F] {
    override def createVoucherForSubscription(
      subscriptionId: String,
      ratePlanName: String
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](Voucher("123456", "654321"))
  }
}
