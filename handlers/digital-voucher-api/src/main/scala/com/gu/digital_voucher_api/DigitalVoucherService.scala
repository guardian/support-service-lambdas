package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Monad
import cats.implicits._
import cats.data.EitherT
import com.gu.digital_voucher_api.imovo.ImovoClient

case class DigitalVoucherServiceError(message: String)

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def createVoucher(subscriptionId: String, ratePlanName: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def replaceVoucher(voucher: Voucher): EitherT[F, DigitalVoucherServiceError, Voucher]
  def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def cancelVouchers(cardCode: String, letterCode: String, cancellationDate: LocalDate): EitherT[F, DigitalVoucherServiceError, Unit]
}

object DigitalVoucherService {
  def apply[F[_]: Monad](imovoClient: ImovoClient[F]): DigitalVoucherService[F] = new DigitalVoucherService[F] {
    override def createVoucher(
      subscriptionId: String,
      ratePlanName: String
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](Voucher("1111111111", "2222222222"))

    override def replaceVoucher(
      voucher: Voucher
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      (
        imovoClient.replaceVoucher(voucher.cardCode).leftMap(List(_)),
        imovoClient.replaceVoucher(voucher.letterCode).leftMap(List(_))
      ).parMapN { (cardResponse, letterResponse) =>
          Voucher(cardResponse.voucherCode, letterResponse.voucherCode)
        }.leftMap(errors => DigitalVoucherServiceError(errors.mkString(", ")))

    override def cancelVouchers(cardCode: String, letterCode: String, cancellationDate: LocalDate): EitherT[F, DigitalVoucherServiceError, Unit] =
      (
        imovoClient.updateVoucher(cardCode, cancellationDate).leftMap(List(_)),
        imovoClient.updateVoucher(letterCode, cancellationDate).leftMap(List(_))
      ).parMapN { (_, _) =>
        ()
      }.leftMap(errors => DigitalVoucherServiceError(errors.mkString(", ")))

    override def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceError](
        Voucher(s"5555555555", s"6666666666")
      )
  }
}
