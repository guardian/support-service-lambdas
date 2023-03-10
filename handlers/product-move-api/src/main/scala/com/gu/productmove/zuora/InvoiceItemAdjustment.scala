package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.InvoiceItemAdjustment.*
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck.None
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{Clock, IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.format.DateTimeFormatter
import java.time.{LocalDate, LocalDateTime}
import scala.collection.immutable.ListMap
import scala.math.Ordered.orderingToOrdered

object InvoiceItemAdjustmentLive:
  val layer: URLayer[ZuoraGet, InvoiceItemAdjustment] = ZLayer.fromFunction(InvoiceItemAdjustmentLive(_))

private class InvoiceItemAdjustmentLive(zuoraGet: ZuoraGet) extends InvoiceItemAdjustment:
  override def update(
      invoiceId: String,
      amount: BigDecimal,
      invoiceItemId: String,
  ): IO[String, InvoiceItemAdjustmentResponse] =
    for {
      today <- Clock.currentDateTime.map(_.toLocalDate)
      response <- zuoraGet.post[PostBody, InvoiceItemAdjustmentResponse](
        uri"object/invoice-item-adjustment",
        PostBody(today, amount, invoiceId, invoiceItemId),
        ZuoraRestBody.ZuoraSuccessCheck.None,
      )
    } yield response

trait InvoiceItemAdjustment:
  def update(invoiceId: String, amount: BigDecimal, invoiceItemId: String): IO[String, InvoiceItemAdjustmentResponse]

object InvoiceItemAdjustment {

  case class PostBody(
      AdjustmentDate: LocalDate,
      Amount: BigDecimal,
      InvoiceId: String,
      SourceId: String, // The invoice item id
      SourceType: String = "InvoiceDetail",
      Type: String = "Charge",
      Comment: String = "Created by the product-move-api refund process to balance a cancelled invoice",
  )

  case class InvoiceItemAdjustmentResponse(Success: String)

  given JsonDecoder[InvoiceItemAdjustmentResponse] = DeriveJsonDecoder.gen[InvoiceItemAdjustmentResponse]
  given JsonEncoder[PostBody] = DeriveJsonEncoder.gen[PostBody]

  def update(
      invoiceId: String,
      amount: BigDecimal,
      invoiceItemId: String,
  ): ZIO[InvoiceItemAdjustment, String, InvoiceItemAdjustmentResponse] =
    ZIO.serviceWithZIO[InvoiceItemAdjustment](_.update(invoiceId, amount, invoiceItemId))
}
