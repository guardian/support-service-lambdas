package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
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
  // TODO: only need one method here
  override def update(
      invoiceId: String,
      amount: BigDecimal,
      invoiceItemId: String,
      adjustmentType: String,
      sourceType: String,
  ): IO[ErrorResponse, InvoiceItemAdjustmentResponse] =
    for {
      today <- Clock.currentDateTime.map(_.toLocalDate)
      response <- zuoraGet.post[PostBody, InvoiceItemAdjustmentResponse](
        uri"object/invoice-item-adjustment",
        PostBody(today, amount, invoiceId, invoiceItemId, adjustmentType, sourceType),
        ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckCapitalised,
      )
    } yield response

  def batchUpdate(
      invoiceItemAdjustments: List[InvoiceItemAdjustment.PostBody],
  ): IO[ErrorResponse, InvoiceItemAdjustmentResponse] =
    for {
      today <- Clock.currentDateTime.map(_.toLocalDate)
      response <- zuoraGet.post[InvoiceItemAdjustmentsWriteRequest, InvoiceItemAdjustmentResponse](
        uri"action/create",
        InvoiceItemAdjustmentsWriteRequest(objects = invoiceItemAdjustments),
        ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckCapitalised,
      )
    } yield response

trait InvoiceItemAdjustment:
  def update(
      invoiceId: String,
      amount: BigDecimal,
      invoiceItemId: String,
      adjustmentType: String,
      sourceType: String,
  ): IO[ErrorResponse, InvoiceItemAdjustmentResponse]

  def batchUpdate(
      invoiceItemAdjustments: List[InvoiceItemAdjustment.PostBody],
  ): IO[ErrorResponse, InvoiceItemAdjustmentResponse]

object InvoiceItemAdjustment {

  case class PostBody(
      AdjustmentDate: LocalDate,
      Amount: BigDecimal,
      InvoiceId: String,
      SourceId: String, // The invoice item id
      Type: String = "Charge",
      SourceType: String,
      Comments: String = "Created by the product-move-api refund process to balance a cancelled invoice",
  )

  case class InvoiceItemAdjustmentResponse(Success: Boolean)

  case class InvoiceItemAdjustmentsWriteRequest(
      objects: List[PostBody],
      `type`: String = "InvoiceItemAdjustment",
  )

  given JsonDecoder[InvoiceItemAdjustmentResponse] = DeriveJsonDecoder.gen[InvoiceItemAdjustmentResponse]
  given JsonEncoder[PostBody] = DeriveJsonEncoder.gen[PostBody]
  given JsonEncoder[InvoiceItemAdjustmentsWriteRequest] = DeriveJsonEncoder.gen[InvoiceItemAdjustmentsWriteRequest]

  def update(
      invoiceId: String,
      amount: BigDecimal,
      invoiceItemId: String,
      adjustmentType: String,
      sourceType: String = "InvoiceDetail",
  ): ZIO[InvoiceItemAdjustment, ErrorResponse, InvoiceItemAdjustmentResponse] =
    ZIO.serviceWithZIO[InvoiceItemAdjustment](_.update(invoiceId, amount, invoiceItemId, adjustmentType, sourceType))

  def batchUpdate(
      invoiceItemAdjustments: List[InvoiceItemAdjustment.PostBody],
  ): ZIO[InvoiceItemAdjustment, ErrorResponse, InvoiceItemAdjustmentResponse] =
    ZIO.serviceWithZIO[InvoiceItemAdjustment](_.batchUpdate(invoiceItemAdjustments))
}
