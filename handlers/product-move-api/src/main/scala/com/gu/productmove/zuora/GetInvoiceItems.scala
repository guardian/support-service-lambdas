package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.GetInvoice.{GetInvoiceItemsResponse}
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

object GetInvoiceItemsLive:
  val layer: URLayer[ZuoraGet, GetInvoiceItems] = ZLayer.fromFunction(GetInvoiceItemsLive(_))

private class GetInvoiceItemsLive(zuoraGet: ZuoraGet) extends GetInvoiceItems:
  override def get(invoiceId: String): IO[ErrorResponse, GetInvoiceItemsResponse] =
    zuoraGet.get[GetInvoiceItemsResponse](
      uri"invoices/$invoiceId/items",
      ZuoraRestBody.ZuoraSuccessCheck.None,
    )

trait GetInvoiceItems:
  def get(invoiceId: String): IO[ErrorResponse, GetInvoiceItemsResponse]

object GetInvoice {

  case class GetInvoiceItemsResponse(id: String, productRatePlanChargeId: String)

  given JsonDecoder[GetInvoiceItemsResponse] = DeriveJsonDecoder.gen[GetInvoiceItemsResponse]

  def get(invoiceId: String): ZIO[GetInvoiceItems, ErrorResponse, GetInvoiceItemsResponse] =
    ZIO.serviceWithZIO[GetInvoiceItems](_.get(invoiceId))
}
