package com.gu.productmove.invoicingapi

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.invoicingapi.InvoicingApiRefund.{RefundRequest, RefundResponse}
import sttp.client3.Response.ExampleGet.uri
import sttp.client3.quick.basicRequest
import sttp.client3.ziojson.*
import sttp.client3.*
import zio.json.*
import zio.{Task, ZIO, ZLayer}

object InvoicingApiRefundLive {
  val layer: ZLayer[Stage with SttpBackend[Task, Any], String, InvoicingApiRefundLive] =
    ZLayer {
      for {
        stage <- ZIO.service[Stage]
        apiKey = sys.env.getOrElse("InvoicingApiKey", throw new RuntimeException("Missing x-api-key for invoicing-api"))
        invoicingApiUrl = s"${sys.env.getOrElse("InvoicingApiUrl", throw new RuntimeException("Missing invoicing-api url"))}/$stage/refund"
        _ <- ZIO.logInfo(s"Invoice API url is $invoicingApiUrl")
        sttpClient <- ZIO.service[SttpBackend[Task, Any]]
      } yield InvoicingApiRefundLive(apiKey, invoicingApiUrl, sttpClient)
    }
}

private class InvoicingApiRefundLive(apiKey: String, url: String, sttpClient: SttpBackend[Task, Any]) extends InvoicingApiRefund :
  override def refund(subscriptionName: String, amount: BigDecimal): ZIO[Any, String, RefundResponse] = {

    val requestBody = RefundRequest(subscriptionName, amount)
    basicRequest
      .contentType("application/json")
      .header("x-api-key", apiKey)
      .body(requestBody.toJson)
      .post(uri"$url")
      .response(asJson[RefundResponse])
      .send(sttpClient)
      .map{ response =>
        response.body match {
          case Left(err) => println(s"Recieved an error from Invoicing refund endpoint: $err")
          case Right(body) => println(s"Recieved a successful response from Invoicing refund endpoint: $body")
        }
        response.body
      }.absolve
      .mapError(_.toString)
  }

trait InvoicingApiRefund {
  def refund(subscriptionName: String, amount: BigDecimal): ZIO[Any, String, RefundResponse]
}

object InvoicingApiRefund {
  case class RefundRequest(subscriptionName: String, refund: BigDecimal)
  /*
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
  case class RefundResponse(subscriptionName: String)

  given JsonEncoder[RefundRequest] = DeriveJsonEncoder.gen[RefundRequest]
  given JsonDecoder[RefundResponse] = DeriveJsonDecoder.gen[RefundResponse]
}
