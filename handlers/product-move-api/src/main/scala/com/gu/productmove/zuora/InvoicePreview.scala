package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.InvoicePreview.ZuoraInvoiceList
import com.gu.productmove.zuora.rest.ZuoraClientLive.{ZuoraRestConfig, bucket, key}
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import scala.math.BigDecimal.RoundingMode.HALF_UP
import scala.util.Try

object InvoicePreviewLive:
  val layer: URLayer[ZuoraGet, InvoicePreview] = ZLayer.fromFunction(InvoicePreviewLive(_))

private class InvoicePreviewLive(zuoraGet: ZuoraGet) extends InvoicePreview :
  override def get(zuoraAccountId: String, targetDate: LocalDate): IO[String, ZuoraInvoiceList] =
    val invoicePreviewRequest = InvoicePreviewRequest(zuoraAccountId, targetDate)

    for {
      response <- zuoraGet.post[InvoicePreviewRequest, ZuoraInvoiceList](uri"operations/billing-preview", invoicePreviewRequest)
    } yield response

trait InvoicePreview:
  def get(zuoraAccountId: String, targetDate: LocalDate): ZIO[InvoicePreview, String, ZuoraInvoiceList]

object InvoicePreview {

  case class ZuoraInvoiceList(invoiceItems: Seq[ZuoraInvoiceItem])
  object ZuoraInvoiceList {
    given JsonDecoder[ZuoraInvoiceList] = DeriveJsonDecoder.gen[ZuoraInvoiceList]
  }

  case class ZuoraInvoiceItem(
    subscriptionNumber: String,
    serviceStartDate: LocalDate,
    chargeNumber: String,
    productName: String
  )
  object ZuoraInvoiceItem {
    given JsonDecoder[ZuoraInvoiceItem] = DeriveJsonDecoder.gen[ZuoraInvoiceItem]
  }

  def get(zuoraAccountId: String, targetDate: LocalDate): ZIO[InvoicePreview, String, ZuoraInvoiceList] = ZIO.serviceWithZIO[InvoicePreview](_.get(zuoraAccountId, targetDate))
}

case class InvoicePreviewRequest(accountId: String, targetDate: LocalDate, assumeRenewal: String = "All", chargeTypeToExclude: String = "OneTime")

object InvoicePreviewRequest {
  given JsonEncoder[InvoicePreviewRequest] = DeriveJsonEncoder.gen[InvoicePreviewRequest]
}
