package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.InvoiceItemQuery.{InvoiceItem, TaxationItem, TaxationItems}
import com.gu.productmove.zuora.RunBilling.InvoiceId
import com.gu.productmove.zuora.model.SubscriptionName
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
import math.Ordered.orderingToOrdered

object InvoiceItemQueryLive {
  val layer: URLayer[ZuoraGet, InvoiceItemQuery] =
    ZLayer.fromFunction(InvoiceItemQueryLive(_))
}

private class InvoiceItemQueryLive(zuoraClient: ZuoraGet) extends InvoiceItemQuery {

  case class PostQueryBody(queryString: String) derives JsonEncoder

  case class InvoiceItemsResponse(records: List[InvoiceItem]) derives JsonDecoder

  private def getInvoiceItemsQuery(subscriptionName: SubscriptionName) =
    s"select Id, AppliedToInvoiceItemId, ChargeAmount, TaxAmount, ChargeDate, InvoiceId FROM InvoiceItem where SubscriptionNumber = '${subscriptionName.value}'"

  def invoiceItemsForSubscription(subscriptionName: SubscriptionName): ZIO[Any, Throwable, List[InvoiceItem]] = {
    zuoraClient
      .post[PostQueryBody, InvoiceItemsResponse](
        uri"action/query",
        PostQueryBody(getInvoiceItemsQuery(subscriptionName)),
        ZuoraRestBody.ZuoraSuccessCheck.None,
      )
      .map(_.records)
  }

  private def getTaxationItemsQuery(invoiceId: InvoiceId) =
    s"select Id, InvoiceItemId, InvoiceId from TaxationItem where InvoiceId = '${invoiceId.id}'"

  def taxationItemsForInvoice(invoiceId: InvoiceId): ZIO[Any, Throwable, List[TaxationItem]] = {
    zuoraClient
      .post[PostQueryBody, TaxationItems](
        uri"action/query",
        PostQueryBody(getTaxationItemsQuery(invoiceId)),
        ZuoraRestBody.ZuoraSuccessCheck.None,
      )
      .map { items =>
        println("Got taxation items")
        items.records
      }
  }

}

trait InvoiceItemQuery {
  def invoiceItemsForSubscription(subscriptionName: SubscriptionName): ZIO[Any, Throwable, List[InvoiceItem]]
  def taxationItemsForInvoice(invoiceId: InvoiceId): ZIO[Any, Throwable, List[TaxationItem]]
}
case class RefundInvoiceDetails(
    refundAmount: BigDecimal,
    negativeInvoiceId: InvoiceId,
    negativeInvoiceItems: List[InvoiceItemWithTaxDetails],
    lastPaidInvoiceId: InvoiceId,
)
case class TaxDetails(amount: BigDecimal, taxationId: String)

object InvoiceItemWithTaxDetails {

  def apply(i: InvoiceItem, taxationItems: List[InvoiceItemQuery.TaxationItem]): InvoiceItemWithTaxDetails = {
    val maybeTaxDetails = for {
      negativeInvoiceItem <- Some(i).filter(_.TaxAmount != 0)
      _ = println(
        s"Tax amount for invoice item $i is ${negativeInvoiceItem.TaxAmount} searching for matching taxation item",
      )
      taxationItem <- taxationItems.find(_.InvoiceItemId == negativeInvoiceItem.Id)
      _ = println(s"Found taxation item $taxationItem")
    } yield TaxDetails(i.TaxAmount, taxationItem.Id)
    InvoiceItemWithTaxDetails(
      Id = i.Id,
      AppliedToInvoiceItemId = i.AppliedToInvoiceItemId,
      ChargeDate = i.ChargeDate,
      ChargeAmount = i.ChargeAmount,
      TaxDetails = maybeTaxDetails,
      InvoiceId = i.InvoiceId,
    )
  }

}
case class InvoiceItemWithTaxDetails(
    Id: String,
    AppliedToInvoiceItemId: Option[String] = None,
    ChargeDate: String,
    ChargeAmount: BigDecimal,
    TaxDetails: Option[TaxDetails],
    InvoiceId: InvoiceId,
) {
  def taxAmount = TaxDetails.map(_.amount).getOrElse(BigDecimal(0))
  def amountWithTax = ChargeAmount + taxAmount
  def chargeDateAsDate = LocalDate.parse(ChargeDate, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
}

object InvoiceItemQuery {

  case class TaxationItem(Id: String, InvoiceId: String, InvoiceItemId: String) derives JsonDecoder

  case class TaxationItems(records: List[TaxationItem]) derives JsonDecoder

  case class InvoiceItem(
      Id: String,
      AppliedToInvoiceItemId: Option[String] = None,
      ChargeDate: String,
      ChargeAmount: BigDecimal,
      TaxAmount: BigDecimal,
      InvoiceId: InvoiceId,
  ) derives JsonDecoder {
    def chargeDateAsDateTime = LocalDateTime.parse(ChargeDate, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
  }
}
