package com.gu.creditprocessor

import java.time.LocalDate
import com.gu.zuora.subscription.ZuoraApiFailure
import sttp.client3._
import sttp.client3.circe._
import io.circe.generic.auto._

object NextInvoiceDate {
  private case class NextInvoiceDate(nextInvoiceDate: LocalDate)
  private implicit val sttpBackend: SttpBackend[Identity, Any] = HttpURLConnectionBackend()
  private val xApiKey = sys.env.getOrElse("InvoicingApiKey", throw new RuntimeException("Missing x-api-key for invoicing-api"))
  private val invoicingApiUrl = sys.env.getOrElse("InvoicingApiUrl", throw new RuntimeException("Missing invoicing-api url"))

  def getNextInvoiceDate(subscriptionName: String): Either[ZuoraApiFailure, LocalDate] = {
    basicRequest.get(uri"$invoicingApiUrl/next-invoice-date/$subscriptionName")
      .header("x-api-key", xApiKey)
      .response(asJson[NextInvoiceDate])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.getMessage)))
      .send(sttpBackend)
      .body
      .map(_.nextInvoiceDate)
  }
}
