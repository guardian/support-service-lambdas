package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.InvoiceId
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import sttp.client3.*
import zio.json.*
import zio.{Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object RunBillingLive {
  val layer: URLayer[ZuoraGet, RunBilling] =
    ZLayer.fromFunction(RunBillingLive(_))
}

private class RunBillingLive(zuoraGet: ZuoraGet) extends RunBilling {
  import RunBilling.*

  // https://developer.zuora.com/v1-api-reference/older-api/operation/Action_POSTgenerate/
  override def run(accountId: ZuoraAccountId, today: LocalDate, targetDate: LocalDate): Task[Option[InvoiceId]] = {
    // make the invoice date today, in case there's been a delay and the accounting period has closed
    val accountToGenerate = AccountToGenerate(accountId, today, targetDate)
    val runBillingRequest = RunBillingRequest(List(accountToGenerate), "Invoice")
    for {
      errorOrRunBillingResponse <- zuoraGet
        .post[RunBillingRequest, RunBillingResponse](
          uri"action/generate",
          runBillingRequest,
          ZuoraRestBody.ZuoraSuccessCheck.None,
        )
        .map(_.head) // we have hard coded one item in the request so there will be one in the response
      maybeInvoiceId <- errorOrRunBillingResponse match {
        case Left(RunBillingErrorResponse(ZuoraError("INVALID_VALUE", _) :: _)) => ZIO.none
        case Left(error: RunBillingErrorResponse) =>
          ZIO.fail(new RuntimeException("generate invoice failed with: " + error))
        case Right(runBillingResponse: RunBillingSuccessResponse) => ZIO.some(InvoiceId(runBillingResponse.Id))
      }
    } yield maybeInvoiceId
  }

  private case class AccountToGenerate(AccountId: ZuoraAccountId, InvoiceDate: LocalDate, TargetDate: LocalDate)
      derives JsonEncoder
  private case class RunBillingRequest(objects: List[AccountToGenerate], `type`: String) derives JsonEncoder
}

trait RunBilling {
  def run(accountId: ZuoraAccountId, today: LocalDate, targetDate: LocalDate): Task[Option[InvoiceId]]
}

object RunBilling {

  given eitherDecoder[A: JsonDecoder, B: JsonDecoder]: JsonDecoder[Either[A, B]] =
    summon[JsonDecoder[A]].orElseEither(summon[JsonDecoder[B]])

  private[zuora] case class RunBillingSuccessResponse(
      Id: String, // ID of the generated invoice
  ) derives JsonDecoder
  private[zuora] case class ZuoraError(Code: String, Message: String) derives JsonDecoder
  private[zuora] case class RunBillingErrorResponse(Errors: List[ZuoraError]) derives JsonDecoder

  private[zuora] type RunBillingResponse = List[Either[RunBillingErrorResponse, RunBillingSuccessResponse]]
  given JsonDecoder[RunBillingResponse] =
    JsonDecoder.list(using eitherDecoder[RunBillingErrorResponse, RunBillingSuccessResponse])

}
