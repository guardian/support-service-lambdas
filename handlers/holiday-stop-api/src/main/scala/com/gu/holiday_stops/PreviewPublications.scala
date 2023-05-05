package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.zuora.subscription.ZuoraApiFailure
import sttp.client3._
import sttp.client3.circe._
import io.circe.generic.auto._

/** https://github.com/guardian/invoicing-api/blob/master/src/main/scala/com/gu/invoicing/preview/README.md */
case class Publication( /* Contrast with InvoiceItem                               */
    publicationDate: LocalDate, /* Date of paper printed on cover                          */
    invoiceDate: LocalDate, /* Publication falls on this invoice                       */
    nextInvoiceDate: LocalDate, /* The invoice on which this publication would be credited */
    productName: String, /* For example Newspaper Delivery                          */
    chargeName: String, /* For example Sunday                                      */
    price: Double, /* Charge of single publication                            */
)

case class PreviewPublicationsResponse(
    subscriptionName: String,
    nextInvoiceDateAfterToday: LocalDate,
    rangeStartDate: LocalDate,
    rangeEndDate: LocalDate,
    publicationsWithinRange: List[Publication],
)

object PreviewPublications {
  private lazy val sttpBackend: SttpBackend[Identity, Any] = HttpURLConnectionBackend()
  def preview(
      subscriptionName: String,
      startDate: String,
      endDate: String,
  ): Either[ZuoraApiFailure, PreviewPublicationsResponse] = {
    for {
      secrets <- Secrets.getInvoicingAPISecrets
      response <- basicRequest
        .get(uri"${secrets.invoicingApiUrl}/preview/$subscriptionName?startDate=$startDate&endDate=$endDate")
        .header("x-api-key", secrets.invoicingApiKey)
        .response(asJson[PreviewPublicationsResponse])
        .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
        .send(sttpBackend)
        .body
    } yield response

  }
}
