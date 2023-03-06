package com.gu.productmove.zuora

import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}
import sttp.model.Uri.UriContext

case class RequestBody(Amount: BigDecimal, Comment: String, SourceTransactionId: String, Type: String)
given JsonEncoder[RequestBody] = DeriveJsonEncoder.gen[RequestBody]

case class Res(Id: String)
given JsonDecoder[Res] = DeriveJsonDecoder.gen[Res]

object CreditBalanceAdjustmentLive:
  val layer: URLayer[ZuoraGet, CreditBalanceAdjustment] = ZLayer.fromFunction(CreditBalanceAdjustmentLive(_))

private class CreditBalanceAdjustmentLive(zuoraGet: ZuoraGet) extends CreditBalanceAdjustment:
  override def adjust(amount: BigDecimal, comment: String, invoiceId: String, `type`: String): IO[String, Res] = {
    val body = RequestBody(amount, comment, invoiceId, `type`)

    zuoraGet.post[RequestBody, Res](
      uri"object/credit-balance-adjustment",
      body,
      ZuoraSuccessCheck.SuccessCheckCapitalised,
    )
  }

trait CreditBalanceAdjustment:
  def adjust(
      amount: BigDecimal,
      comment: String,
      invoiceId: String,
      `type`: String,
  ): ZIO[CreditBalanceAdjustment, String, Res]

object CreditBalanceAdjustment {
  def adjust(
      amount: BigDecimal,
      comment: String,
      invoiceId: String,
      `type`: String,
  ): ZIO[CreditBalanceAdjustment, String, Res] =
    ZIO.serviceWithZIO[CreditBalanceAdjustment](_.adjust(amount, comment, invoiceId, `type`))
}
