package com.gu.zuora.subscription

import com.gu.zuora.{AccessToken, ZuoraConfig}
import io.circe.generic.semiauto._
import io.circe.{Decoder, Encoder, HCursor}
import sttp.client3._
import sttp.client3.circe._

import java.time.LocalDate

object GetBillingPreview {

  case class InvoiceItem(
      chargeDate: LocalDate,
      chargeId: String,
  )
  implicit val decode: Decoder[InvoiceItem] = (c: HCursor) =>
    for {
      chargeDate <- c.downField("chargeDate").as[String].map(_.takeWhile(_ != ' ')).map(LocalDate.parse)
      chargeId <- c.downField("chargeId").as[String]
    } yield InvoiceItem(chargeDate, chargeId)

  case class BillingPreview(
      invoiceItems: List[InvoiceItem],
  )
  implicit val decode2: Decoder[BillingPreview] = deriveDecoder
  implicit val encode: Encoder[BillingPreviewRequest] = deriveEncoder
  case class BillingPreviewRequest(
      accountNumber: String,
      targetDate: LocalDate,
      assumeRenewal: String = "Autorenew",
  )
}
trait GetBillingPreview {
  import GetBillingPreview._
  def getBillingPreview(
      accessToken: AccessToken,
      accountNumber: String,
      targetDate: LocalDate,
  ): Either[ApiFailure, List[InvoiceItem]]
}

object GetBillingPreviewLive {

  def billingPreviewGetResponse(
      config: ZuoraConfig,
      backend: SttpBackend[Identity, Any],
  ): GetBillingPreview =
    (accessToken: AccessToken, accountNumber: String, targetDate: LocalDate) => {
      val request = GetBillingPreview.BillingPreviewRequest(accountNumber, targetDate)
      basicRequest
        .post(uri"${config.baseUrl}/operations/billing-preview")
        .body(request)
        .header("Authorization", s"Bearer ${accessToken.access_token}")
        .response(asJson[GetBillingPreview.BillingPreview])
        .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
        .send(backend)
        .body
        .map(_.invoiceItems)
    }

}
