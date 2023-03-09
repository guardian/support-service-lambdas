package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck.None
import com.gu.productmove.zuora.rest.{ZuoraGet, ZuoraRestBody}
import GetInvoiceToBeRefunded.InvoiceItem
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
import GetInvoiceItems.*

object GetInvoiceItemsLive:
  val layer: URLayer[ZuoraGet, GetInvoiceItems] = ZLayer.fromFunction(GetInvoiceItemsLive(_))

private class GetInvoiceItemsLive(zuoraGet: ZuoraGet) extends GetInvoiceItems:
  override def get(invoiceId: String): IO[String, GetInvoiceItemsResponse] =
    zuoraGet.get[GetInvoiceItemsResponse](
      uri"invoices/$invoiceId/items",
      ZuoraRestBody.ZuoraSuccessCheck.None,
    )

trait GetInvoiceItems:
  def get(invoiceId: String): IO[String, GetInvoiceItemsResponse]

object GetInvoiceItems {

  case class GetInvoiceItemsResponse(invoiceItems: List[InvoiceItem])

  case class InvoiceItem(
      id: String,
      chargeAmount: BigDecimal,
  )

  given JsonDecoder[GetInvoiceItemsResponse] = DeriveJsonDecoder.gen[GetInvoiceItemsResponse]

  given JsonDecoder[InvoiceItem] = DeriveJsonDecoder.gen[InvoiceItem]

  def get(invoiceId: String): ZIO[GetInvoiceItems, String, GetInvoiceItemsResponse] =
    ZIO.serviceWithZIO[GetInvoiceItems](_.get(invoiceId))
}
