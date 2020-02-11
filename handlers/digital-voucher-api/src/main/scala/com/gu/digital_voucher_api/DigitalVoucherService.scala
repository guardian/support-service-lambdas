package com.gu.digital_voucher_api

import cats.Monad
import cats.data.EitherT
sealed trait DigitalVoucherServiceError

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def createVoucher(subscriptionId: String, ratePlanName: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def replaceVoucher(voucher: Voucher): EitherT[F, DigitalVoucherServiceError, Voucher]
  def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def deleteVoucherForSubscription(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Unit]
}

object DigitalVoucherService {
  def apply[F[_]: Monad](): DigitalVoucherService[F] = new DigitalVoucherService[F] {
    override def createVoucher(
      subscriptionId: String,
      ratePlanName: String
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](Voucher("1111111111", "2222222222"))

    override def replaceVoucher(
      voucher: Voucher
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](
        Voucher("3333333333", "4444444444")
      )

    override def deleteVoucherForSubscription(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Unit] =
      EitherT.rightT(())

    override def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](
        Voucher(s"5555555555", s"6666666666")
      )
  }
}
