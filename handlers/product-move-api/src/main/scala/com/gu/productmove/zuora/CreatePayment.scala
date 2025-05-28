package com.gu.productmove.zuora

import com.gu.i18n.Currency
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.model.InvoiceId
import com.gu.productmove.zuora.model.{SubscriptionId, SubscriptionName}
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.productmove.zuora.rest.ZuoraRestBody.{ZuoraSuccessCheck, ZuoraSuccessLowercase}
import com.gu.util.config
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.json.ast.Json
import zio.json.internal.Write
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import java.time.temporal.ChronoUnit

trait CreatePayment {
  def create(
      accountId: ZuoraAccountId,
      invoiceId: InvoiceId,
      paymentMethodId: String,
      amount: BigDecimal,
      today: LocalDate,
  ): Task[CreatePaymentResponse]
}

object CreatePaymentLive {
  val layer: URLayer[ZuoraGet, CreatePayment] = ZLayer.fromFunction(CreatePaymentLive(_))
}

private class CreatePaymentLive(zuoraGet: ZuoraGet) extends CreatePayment {
  override def create(
      accountId: ZuoraAccountId,
      invoiceId: InvoiceId,
      paymentMethodId: String,
      amount: BigDecimal,
      today: LocalDate,
  ): Task[CreatePaymentResponse] = for {
    _ <- ZIO.log(
      s"Attempting to create payment on account $accountId, invoice $invoiceId, paymentMethodId $paymentMethodId for amount $amount",
    )
    requestBody = CreatePaymentRequest(
      AccountId = accountId.value,
      InvoiceId = invoiceId,
      PaymentMethodId = paymentMethodId,
      Amount = amount,
      AppliedInvoiceAmount = amount,
      EffectiveDate = today,
    )
    // https://developer.zuora.com/api-references/older-api/operation/Object_POSTPayment/
    response <- zuoraGet
      .post[CreatePaymentRequest, CreatePaymentResponse](
        relativeUrl = uri"object/payment",
        input = requestBody,
        zuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckCapitalised,
      )
    _ <- ZIO.log(s"Successfully created payment")
  } yield response
}

object CreatePayment {
  def create(
      accountId: ZuoraAccountId,
      invoiceId: InvoiceId,
      paymentMethodId: String,
      amount: BigDecimal,
      today: LocalDate,
  ): RIO[CreatePayment, CreatePaymentResponse] =
    ZIO.serviceWithZIO[CreatePayment](_.create(accountId, invoiceId, paymentMethodId, amount, today))
}
case class CreatePaymentRequest(
    AccountId: String,
    InvoiceId: InvoiceId,
    PaymentMethodId: String,
    Amount: BigDecimal,
    AppliedInvoiceAmount: BigDecimal,
    EffectiveDate: LocalDate,
    AppliedCreditBalanceAmount: BigDecimal = 0,
    Type: String = "Electronic",
    Status: String = "Processed",
)
case class CreatePaymentResponse(Success: Option[Boolean])
object CreatePaymentResponse {
  given JsonDecoder[CreatePaymentResponse] = DeriveJsonDecoder.gen[CreatePaymentResponse]
}
given JsonEncoder[CreatePaymentRequest] = DeriveJsonEncoder.gen[CreatePaymentRequest]
