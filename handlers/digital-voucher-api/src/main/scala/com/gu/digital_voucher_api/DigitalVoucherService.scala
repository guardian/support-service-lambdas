package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Monad
import cats.implicits._
import cats.data.EitherT
import com.gu.digital_voucher_api.imovo.{ImovoClient, ImovoSubscriptionResponse, ImovoVoucherResponse}

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def oldCreateVoucher(subscriptionId: SfSubscriptionId, ratePlanName: RatePlanName): EitherT[F, DigitalVoucherApiException, Voucher]
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
      RatePlanName("Sunday") -> sundayCampaignCodes,
      RatePlanName("Sunday+") -> sundayCampaignCodes,
      RatePlanName("Weekend") -> weekendCampaignCodes,
      RatePlanName("Weekend+") -> weekendCampaignCodes,
      RatePlanName("Sixday") -> sixDayCampaignCodes,
      RatePlanName("Sixday+") -> sixDayCampaignCodes,
    )
  }

  private val schemeNames: Map[RatePlanName, SchemeName] = {
    val everydaySchemeName = SchemeName("Guardian7Day")
    val sundaySchemeName = SchemeName("GuardianSunday")
    val weekendSchemeName = SchemeName("GuardianWeekend")
    val sixDaySchemeName = SchemeName("Guardian6Day")

    Map(
      RatePlanName("Everyday") -> everydaySchemeName,
      RatePlanName("Everyday+") -> everydaySchemeName,
      RatePlanName("Sunday") -> sundaySchemeName,
      RatePlanName("Sunday+") -> sundaySchemeName,
      RatePlanName("Weekend") -> weekendSchemeName,
      RatePlanName("Weekend+") -> weekendSchemeName,
      RatePlanName("Sixday") -> sixDaySchemeName,
      RatePlanName("Sixday+") -> sixDaySchemeName,
    )
  }

  def apply[F[_]: Monad](imovoClient: ImovoClient[F]): DigitalVoucherService[F] = new
      DigitalVoucherService[F] {

    override def createVoucher(
      subscriptionId: SfSubscriptionId,
      ratePlanName: RatePlanName
    ): EitherT[F, DigitalVoucherApiException, Voucher] = {
      val tomorrow = LocalDate.now.plusDays(1)

      for {
        schemeName <- schemeNames
          .get(ratePlanName)
          .toRight(DigitalVoucherApiException(InvalidArgumentException(s"Rate plan name has no matching scheme name: $ratePlanName")))
          .toEitherT[F]
        voucherResponse <- imovoClient
          .createSubscriptionVoucher(subscriptionId, schemeName, tomorrow)
          .leftMap { error =>
            DigitalVoucherApiException(ImovoClientException(error.toString))
          }
        voucher <- toVoucher(voucherResponse).toEitherT[F]
      } yield voucher
    }

    def toVoucher(voucherResponse: ImovoSubscriptionResponse): Either[DigitalVoucherApiException, Voucher] = {
      (
        voucherResponse
          .subscriptionVouchers
          .find(_.subscriptionType === "ActiveLetter")
          .toRight(List("Imovo response did not contain an subscription voucher where subscriptionType==\"ActiveLetter\" ")),
        voucherResponse
          .subscriptionVouchers
          .find(_.subscriptionType === "ActiveCard")
          .toRight(List("Imovo response did not contain an subscription voucher where subscriptionType==\"ActiveCard\" "))
      ).parMapN { (letterVoucher, cardVoucher) =>
        Voucher(cardVoucher.voucherCode, letterVoucher.voucherCode)
      }.leftMap { errors =>
        DigitalVoucherApiException(ImovoInvalidResponseException(errors.mkString(",")))
      }
    }


    override def oldCreateVoucher(
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
        }.leftMap(errors =>
          DigitalVoucherApiException(ImovoClientException(errors.map(_.message).mkString(", ")))
        )
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
