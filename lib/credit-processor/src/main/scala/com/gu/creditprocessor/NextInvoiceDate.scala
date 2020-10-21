package com.gu.creditprocessor

import java.time.LocalDate
import com.gu.zuora.subscription.ZuoraApiFailure
import com.softwaremill.sttp._
import com.softwaremill.sttp.circe._
import io.circe.generic.auto._

case class NextInvoiceDate(nextInvoiceDate: LocalDate)

object NextInvoiceDate {
  private implicit val sttpBackend: SttpBackend[Id, Nothing] = HttpURLConnectionBackend()
  private val xApiKey = sys.env.getOrElse("InvoicingApiKey", throw new RuntimeException("Missing x-api-key for invoicing-api"))
  private val invoicingApiUrl = sys.env.getOrElse("InvoicingApiUrl", throw new RuntimeException("Missing invoicing-api url"))

  def getNextInvoiceDate(subscriptionName: String): Either[ZuoraApiFailure, LocalDate] = {
    sttp.get(uri"$invoicingApiUrl/next-invoice-date/$subscriptionName")
      .header("x-api-key", xApiKey)
      .response(asJson[NextInvoiceDate])
      .mapResponse(_.left.map(e => ZuoraApiFailure(e.message)))
      .send()
      .body.left.map(ZuoraApiFailure)
      .joinRight
      .map(_.nextInvoiceDate)
  }
}
