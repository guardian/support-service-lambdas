package com.gu.productmove.invoicingapi

import com.gu.productmove.AwsS3
import com.gu.productmove.GuReaderRevenuePrivateS3.{bucket, key}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.Util.getFromEnv
import com.gu.productmove.invoicingapi.InvoicingApiRefund.{RefundRequest, RefundResponse}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive.InvoicingApiConfig
import sttp.client3.Response.ExampleGet.uri
import sttp.client3.quick.basicRequest
import sttp.client3.ziojson.*
import sttp.client3.*
import zio.json.*
import zio.{Task, ZIO, ZLayer}

object InvoicingApiRefundLive {

  case class InvoicingApiConfig(url: String, apiKey: String)

  object InvoicingApiConfig {
    given JsonDecoder[InvoicingApiConfig] = DeriveJsonDecoder.gen[InvoicingApiConfig]
  }

  val layer: ZLayer[SttpBackend[Task, Any] with AwsS3, String, InvoicingApiRefundLive] =
    ZLayer {
      for {
        invoicingApiUrl <- ZIO.fromEither(getFromEnv("invoicingApiUrl")).map(_ + "/refund")
        invoicingApiKey <- ZIO.fromEither(getFromEnv("invoicingApiKey"))

        invoicingApiConfig = InvoicingApiConfig(invoicingApiUrl, invoicingApiKey)

        _ <- ZIO.logInfo(s"Invoice API url is ${invoicingApiConfig.url}")
        sttpClient <- ZIO.service[SttpBackend[Task, Any]]
      } yield InvoicingApiRefundLive(invoicingApiConfig, sttpClient)
    }
}

private class InvoicingApiRefundLive(config: InvoicingApiConfig, sttpClient: SttpBackend[Task, Any])
    extends InvoicingApiRefund {
  override def refund(
      subscriptionName: String,
      amount: BigDecimal,
      adjustInvoices: Boolean,
  ): ZIO[Any, String, RefundResponse] = {

    val requestBody = RefundRequest(subscriptionName, amount, adjustInvoices)
    basicRequest
      .contentType("application/json")
      .header("x-api-key", config.apiKey)
      .body(requestBody.toJson)
      .post(uri"${config.url}")
      .response(asJson[RefundResponse])
      .send(sttpClient)
      .map { response =>
        response.body match {
          case Left(err) => println(s"Received an error from Invoicing refund endpoint: $err")
          case Right(body) => println(s"Received a successful response from Invoicing refund endpoint: $body")
        }
        response.body
      }
      .absolve
      .mapError(_.toString)
  }
}

trait InvoicingApiRefund {
  def refund(subscriptionName: String, amount: BigDecimal, adjustInvoices: Boolean): ZIO[Any, String, RefundResponse]
}

object InvoicingApiRefund {
  def refund(
      subscriptionName: String,
      amount: BigDecimal,
      adjustInvoices: Boolean = true,
  ): ZIO[InvoicingApiRefund, String, RefundResponse] =
    ZIO.serviceWithZIO[InvoicingApiRefund](_.refund(subscriptionName, amount, adjustInvoices))

  case class RefundRequest(subscriptionName: String, refund: BigDecimal, adjustInvoices: Boolean)
  /* Full response from Invoicing api is as follows:
  {
    "subscriptionName": "A-S00427546",
    "refundAmount": 30,
    "invoiceId": "8ad0877b8373493d018389a5f5301259",
    "paymentId": "8ad0877b8373493d018389a5f57f1262",
    "adjustments": [
        {
            "AdjustmentDate": "2022-09-29",
            "Amount": 30,
            "Comments": "e6282ccd-d06a-49bd-ad2e-9c362e912232",
            "InvoiceId": "8ad0877b8373493d018389a5f5301259",
            "Type": "Credit",
            "SourceType": "InvoiceDetail",
            "SourceId": "8ad0877b8373493d018389a5f539125a"
        }
    ],
    "guid": "e6282ccd-d06a-49bd-ad2e-9c362e912232"
}
   */
  case class RefundResponse(subscriptionName: String, invoiceId: String)

  given JsonEncoder[RefundRequest] = DeriveJsonEncoder.gen[RefundRequest]
  given JsonDecoder[RefundResponse] = DeriveJsonDecoder.gen[RefundResponse]
}
