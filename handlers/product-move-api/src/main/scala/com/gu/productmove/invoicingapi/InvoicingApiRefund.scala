package com.gu.productmove.invoicingapi

import com.gu.productmove.AwsS3
import com.gu.productmove.Secrets
import com.gu.productmove.GuReaderRevenuePrivateS3.{bucket, key}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.Util.getFromEnv
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.invoicingapi.InvoicingApiRefund.{RefundRequest, RefundResponse}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive.InvoicingApiConfig
import com.gu.productmove.zuora.model.SubscriptionName
import sttp.client3.Response.ExampleGet.uri
import sttp.client3.quick.basicRequest
import sttp.client3.ziojson.*
import sttp.client3.*
import zio.json.*
import zio.{RIO, RLayer, Task, ZIO, ZLayer}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.SecretsError

object InvoicingApiRefundLive {

  case class InvoicingApiConfig(url: String, apiKey: String)

  object InvoicingApiConfig {
    given JsonDecoder[InvoicingApiConfig] = DeriveJsonDecoder.gen[InvoicingApiConfig]
  }

  val layer: RLayer[SttpBackend[Task, Any] with AwsS3 with Secrets, InvoicingApiRefundLive] =
    ZLayer {
      for {
        secrets <- ZIO.service[Secrets]
        invoicingAPISecrets <- secrets.getInvoicingAPISecrets.tapError(ex =>
          ZIO.fail(new Throwable(s"Failed to get InvoicingApi secrets because", ex)),
        )
        invoicingApiUrl = invoicingAPISecrets.InvoicingApiUrl
        invoicingApiKey = invoicingAPISecrets.InvoicingApiKey
        invoicingApiConfig = InvoicingApiConfig(invoicingApiUrl + "/refund", invoicingApiKey)
        _ <- ZIO.logInfo(s"Invoice API url is ${invoicingApiConfig.url}")
        sttpClient <- ZIO.service[SttpBackend[Task, Any]]
      } yield InvoicingApiRefundLive(invoicingApiConfig, sttpClient)
    }
}

private class InvoicingApiRefundLive(config: InvoicingApiConfig, sttpClient: SttpBackend[Task, Any])
    extends InvoicingApiRefund {
  override def refund(
      subscriptionName: SubscriptionName,
      amount: BigDecimal,
  ): Task[RefundResponse] = {

    val requestBody = RefundRequest(subscriptionName, amount)
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
  }
}

trait InvoicingApiRefund {
  def refund(subscriptionName: SubscriptionName, amount: BigDecimal): Task[RefundResponse]
}

object InvoicingApiRefund {
  def refund(
      subscriptionName: SubscriptionName,
      amount: BigDecimal,
  ): RIO[InvoicingApiRefund, RefundResponse] =
    ZIO.serviceWithZIO[InvoicingApiRefund](_.refund(subscriptionName, amount))

  case class RefundRequest(subscriptionName: SubscriptionName, refund: BigDecimal)
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
