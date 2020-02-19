package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Monad
import cats.implicits._
import cats.data.EitherT
import com.gu.digital_voucher_api.imovo.ImovoClient

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def createVoucher(subscriptionId: SfSubscriptionId, ratePlanName: RatePlanName): EitherT[F, DigitalVoucherApiException, Voucher]
  def replaceVoucher(voucher: Voucher): EitherT[F, DigitalVoucherServiceException, Voucher]
  def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceException, Voucher]
  def cancelVouchers(cardCode: String, cancellationDate: LocalDate): EitherT[F, DigitalVoucherServiceException, Unit]
}

object DigitalVoucherService {

  private val campaignCodes: Map[RatePlanName, CampaignCodeSet] = {

    val everydayCampaignCodes = CampaignCodeSet(
      CampaignCode("GMGSub7DayCard"),
      CampaignCode("GMGSub7DayHNDSS")
    )
    val sundayCampaignCodes = CampaignCodeSet(
      CampaignCode("GMGSubSundayCard"),
      CampaignCode("GMGSubSundayHNDSS")
    )
    val weekendCampaignCodes = CampaignCodeSet(
      CampaignCode("GMGSubWeekendCard"),
      CampaignCode("GMGSubWeekendHNDSS")
    )
    val sixDayCampaignCodes = CampaignCodeSet(
      CampaignCode("GMGSub6DayCard"),
      CampaignCode("GMGSub6DayHNDSS")
    )

    Map(
      RatePlanName("Everyday") -> everydayCampaignCodes,
      RatePlanName("Everyday+") -> everydayCampaignCodes,
      RatePlanName("Saturday") ->
      CampaignCodeSet(CampaignCode("TODO"), CampaignCode("TODO")),
      RatePlanName("Saturday+") ->
      CampaignCodeSet(CampaignCode("TODO"), CampaignCode("TODO")),
      RatePlanName("Sunday") -> sundayCampaignCodes,
      RatePlanName("Sunday+") -> sundayCampaignCodes,
      RatePlanName("Weekend") -> weekendCampaignCodes,
      RatePlanName("Weekend+") -> weekendCampaignCodes,
      RatePlanName("Sixday") -> sixDayCampaignCodes,
      RatePlanName("Sixday+") -> sixDayCampaignCodes,
    )
  }

  def apply[F[_]: Monad](imovoClient: ImovoClient[F]): DigitalVoucherService[F] = new
      DigitalVoucherService[F] {

    override def createVoucher(
      subscriptionId: SfSubscriptionId,
      ratePlanName: RatePlanName
    ): EitherT[F, DigitalVoucherApiException, Voucher] = {

      def requestVoucher(code: CampaignCodeSet) = {
        val tomorrow = LocalDate.now.plusDays(1)
        (
          imovoClient.createVoucher(subscriptionId, code.card, tomorrow).leftMap(List(_)),
          imovoClient.createVoucher(subscriptionId, code.letter, tomorrow).leftMap(List(_))
          ).parMapN { (cardResponse, letterResponse) =>
          Voucher(cardResponse.voucherCode, letterResponse.voucherCode)
        }.leftMap(es => DigitalVoucherApiException(es.head))
      }

      campaignCodes.get(ratePlanName).map(requestVoucher).getOrElse {
        EitherT.leftT(DigitalVoucherApiException(InvalidArgumentException(
          s"Rate plan name has no matching campaign codes: $ratePlanName"
        )))
      }
    }

    override def replaceVoucher(
      voucher: Voucher
    ): EitherT[F, DigitalVoucherServiceException, Voucher] =
      (
        imovoClient.replaceVoucher(voucher.cardCode).leftMap(List(_)),
        imovoClient.replaceVoucher(voucher.letterCode).leftMap(List(_))
      ).parMapN { (cardResponse, letterResponse) =>
          Voucher(cardResponse.voucherCode, letterResponse.voucherCode)
        }.leftMap(errors => DigitalVoucherServiceException(errors.mkString(", ")))

    override def cancelVouchers(cardCode: String, cancellationDate: LocalDate): EitherT[F, DigitalVoucherServiceException, Unit] =
      imovoClient.updateVoucher(cardCode, cancellationDate).leftMap(error => DigitalVoucherServiceException(error.message))

    override def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceException, Voucher] =
      EitherT.rightT[F, DigitalVoucherServiceException](
        Voucher(s"5555555555", s"6666666666")
      )
  }
}
