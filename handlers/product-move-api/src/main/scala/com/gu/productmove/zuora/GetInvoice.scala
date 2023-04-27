package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.GetInvoice.GetInvoiceResponse
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck.None
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.format.DateTimeFormatter
import java.time.{LocalDate, LocalDateTime}
import scala.collection.immutable.ListMap
import scala.math.Ordered.orderingToOrdered

object GetInvoiceLive:
  val layer: URLayer[ZuoraGet, GetInvoice] = ZLayer.fromFunction(GetInvoiceLive(_))

private class GetInvoiceLive(zuoraGet: ZuoraGet) extends GetInvoice:
  override def get(invoiceId: String): IO[ErrorResponse, GetInvoiceResponse] =
    zuoraGet.get[GetInvoiceResponse](
      uri"invoices/$invoiceId",
      ZuoraRestBody.ZuoraSuccessCheck.None,
    )

trait GetInvoice:
  def get(invoiceId: String): IO[ErrorResponse, GetInvoiceResponse]

object GetInvoice {

  case class GetInvoiceResponse(balance: BigDecimal)

  given JsonDecoder[GetInvoiceResponse] = DeriveJsonDecoder.gen[GetInvoiceResponse]

  def get(invoiceId: String): ZIO[GetInvoice, ErrorResponse, GetInvoiceResponse] =
    ZIO.serviceWithZIO[GetInvoice](_.get(invoiceId))
}
