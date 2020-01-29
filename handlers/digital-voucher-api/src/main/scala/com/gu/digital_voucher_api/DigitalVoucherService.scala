package com.gu.digital_voucher_api

import cats.Monad
import cats.data.EitherT
sealed trait DigitalVoucherServiceError

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def createVoucher(subscriptionId: String, ratePlanName: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def replaceVoucher(subscriptionId: String, ratePlanName: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def deleteVoucherForSubscription(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Unit]
}

object DigitalVoucherService {
  def apply[F[_]: Monad](): DigitalVoucherService[F] = new DigitalVoucherService[F] {
    override def createVoucher(
      subscriptionId: String,
      ratePlanName: String
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](Voucher(s"$subscriptionId-card-code", s"$subscriptionId-letter-code"))

    override def replaceVoucher(
      subscriptionId: String,
      ratePlanName: String
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](
        Voucher(s"$subscriptionId-replaced-card-code", s"$subscriptionId-replaced-letter-code")
      )

    override def deleteVoucherForSubscription(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Unit] =
      EitherT.rightT(())

    override def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](
        Voucher(s"$subscriptionId-card-code", s"$subscriptionId-letter-code")
      )
  }
}
