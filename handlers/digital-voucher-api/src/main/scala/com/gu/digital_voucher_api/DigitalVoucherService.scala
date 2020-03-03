package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Monad
import cats.implicits._
import cats.data.EitherT
import com.gu.digital_voucher_api.imovo.{ImovoClient, ImovoSubscriptionResponse}

case class Voucher(cardCode: String, letterCode: String)

trait DigitalVoucherService[F[_]] {
  def oldCreateVoucher(subscriptionId: SfSubscriptionId, ratePlanName: RatePlanName): EitherT[F, DigitalVoucherServiceError, Voucher]
  def createVoucher(subscriptionId: SfSubscriptionId, ratePlanName: RatePlanName): EitherT[F, DigitalVoucherServiceError, Voucher]
  def replaceVoucher(voucher: Voucher): EitherT[F, DigitalVoucherServiceError, Voucher]
  def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher]
  def cancelVouchers(cardCode: String, cancellationDate: LocalDate): EitherT[F, DigitalVoucherServiceError, Unit]
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
    ): EitherT[F, DigitalVoucherServiceError, Voucher] = {
      val tomorrow = LocalDate.now.plusDays(1)

      for {
        schemeName <- schemeNames
          .get(ratePlanName)
          .toRight(InvalidArgumentException(s"Rate plan name has no matching scheme name: $ratePlanName"))
          .toEitherT[F]
        voucherResponse <- imovoClient
          .createSubscriptionVoucher(subscriptionId, schemeName, tomorrow)
          .leftMap { error =>
            ImovoOperationFailedException(error.toString)
          }
        voucher <- toVoucher(voucherResponse).toEitherT[F]
      } yield voucher
    }

    def toVoucher(voucherResponse: ImovoSubscriptionResponse): Either[DigitalVoucherServiceError, Voucher] = {
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
        DigitalVoucherServiceFailure(errors.mkString(","))
      }
    }


    override def oldCreateVoucher(
      subscriptionId: SfSubscriptionId,
      ratePlanName: RatePlanName
    ): EitherT[F, DigitalVoucherServiceError, Voucher] = {

      def requestVoucher(code: CampaignCodeSet): EitherT[F, DigitalVoucherServiceError, Voucher] = {
        val tomorrow = LocalDate.now.plusDays(1)
        (
          imovoClient.createVoucher(subscriptionId, code.card, tomorrow).leftMap(List(_)),
          imovoClient.createVoucher(subscriptionId, code.letter, tomorrow).leftMap(List(_))
          ).parMapN { (cardResponse, letterResponse) =>
          Voucher(cardResponse.voucherCode, letterResponse.voucherCode)
        }.leftMap(errors =>
          ImovoOperationFailedException(errors.map(_.message).mkString(", "))
        )
      }

      campaignCodes.get(ratePlanName).map(requestVoucher).getOrElse {
        EitherT.leftT(InvalidArgumentException(
          s"Rate plan name has no matching campaign codes: $ratePlanName"
        ))
      }
    }

    override def replaceVoucher(
      voucher: Voucher
    ): EitherT[F, DigitalVoucherServiceError, Voucher] =
      (
        imovoClient.replaceVoucher(voucher.cardCode).leftMap(List(_)),
        imovoClient.replaceVoucher(voucher.letterCode).leftMap(List(_))
      ).parMapN { (cardResponse, letterResponse) =>
          Voucher(cardResponse.voucherCode, letterResponse.voucherCode)
        }.leftMap(errors => DigitalVoucherServiceFailure(errors.mkString(", ")))

    override def cancelVouchers(cardCode: String, cancellationDate: LocalDate): EitherT[F, DigitalVoucherServiceError, Unit] =
      imovoClient
        .updateVoucher(cardCode, cancellationDate)
        .leftMap(error => DigitalVoucherServiceFailure(error.message))

    override def getVoucher(subscriptionId: String): EitherT[F, DigitalVoucherServiceError, Voucher] =
      for {
        voucherResponse <- imovoClient
          .getSubscriptionVoucher(subscriptionId)
          .leftMap(error => DigitalVoucherServiceFailure(error.message))
        voucher <- toVoucher(voucherResponse).toEitherT[F]
      } yield voucher
  }
}
