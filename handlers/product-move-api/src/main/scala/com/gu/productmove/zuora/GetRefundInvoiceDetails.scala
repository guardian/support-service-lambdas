package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
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

object GetRefundInvoiceDetailsLive {
  val layer: URLayer[ZuoraGet, GetRefundInvoiceDetails] =
    ZLayer.fromFunction(GetRefundInvoiceDetailsLive(_))
}

private class GetRefundInvoiceDetailsLive(zuoraGet: ZuoraGet) extends GetRefundInvoiceDetails {
  private def getInvoiceItemsQuery(subscriptionName: SubscriptionName) =
    s"select Id, AppliedToInvoiceItemId, ChargeAmount, TaxAmount, ChargeDate, InvoiceId FROM InvoiceItem where SubscriptionNumber = '${subscriptionName.value}'"
  private def getTaxationItemsQuery(invoiceId: String) =
    s"select Id, InvoiceItemId, InvoiceId from TaxationItem where InvoiceId = '$invoiceId'"
  override def get(subscriptionName: SubscriptionName): Task[RefundInvoiceDetails] = {
    for {
      invoiceItems <- zuoraGet
        .post[PostBody, InvoiceItemsResponse](
          uri"action/query",
          PostBody(getInvoiceItemsQuery(subscriptionName)),
          ZuoraRestBody.ZuoraSuccessCheck.None,
        )
        .map(_.records)
      refundAmount <- getLastPaidInvoiceAmount(invoiceItems)
      negativeInvoiceId <- getNegativeInvoiceId(invoiceItems)
      negativeInvoiceItems <- getNegativeInvoiceItems(invoiceItems)
      taxationItems <-
        if (invoiceIncludesTax(invoiceItems)) {
          println("Invoice items have tax, fetching taxation items")
          zuoraGet
            .post[PostBody, TaxationItems](
              uri"action/query",
              PostBody(getTaxationItemsQuery(negativeInvoiceId)),
              ZuoraRestBody.ZuoraSuccessCheck.None,
            )
            .map { items =>
              println("Got taxation items")
              items.records
            }
        } else ZIO.succeed(Nil)
    } yield RefundInvoiceDetails(
      refundAmount,
      negativeInvoiceId,
      negativeInvoiceItems.map(i =>
        InvoiceItemWithTaxDetails(
          Id = i.Id,
          AppliedToInvoiceItemId = i.AppliedToInvoiceItemId,
          ChargeDate = i.ChargeDate,
          ChargeAmount = i.ChargeAmount,
          TaxDetails = if (i.TaxAmount != 0) {
            println(s"Tax amount for invoice item $i is ${i.TaxAmount} searching for matching taxation item")
            val item = taxationItems.find(_.InvoiceItemId == i.Id)
            if (item.isDefined)
              println(s"Found taxation item $item")
            else
              println("Couldn't find taxation item")
            item.map(taxationItem => TaxDetails(i.TaxAmount, taxationItem.Id))
          } else {
            None
          },
          InvoiceId = i.InvoiceId,
        ),
      ),
    )
  }
  private def invoiceIncludesTax(invoiceItems: List[InvoiceItem]) =
    invoiceItems.exists(_.TaxAmount > 0)
  private def getNegativeInvoice(items: List[InvoiceItem]): Task[(String, List[InvoiceItem])] =
    getInvoicesSortedByDate(items).headOption
      .map(ZIO.succeed(_))
      .getOrElse(
        ZIO.fail(
          new Throwable(
            s"Empty list of invoice items in response $items this is an error " +
              s"as we need the cancellation invoice items to carry out a refund",
          ),
        ),
      )
  private def getNegativeInvoiceId(items: List[InvoiceItem]) = getNegativeInvoice(items).map {
    case (invoiceId, invoiceItems) =>
      invoiceId
  }
  private def getNegativeInvoiceItems(items: List[InvoiceItem]) = getNegativeInvoice(items).map {
    case (invoiceId, invoiceItems) =>
      invoiceItems
  }
  private def getLastPaidInvoice(
      items: List[InvoiceItem],
  ): Task[(String, List[InvoiceItem])] = {
    val sorted = getInvoicesSortedByDate(items)
    sorted.tail.headOption
      .map(ZIO.succeed(_))
      .getOrElse(
        ZIO.fail(
          new Throwable(
            s"There was only one invoice item in response $items this is an error " +
              s"as we need the cancellation invoice items to carry out a refund",
          ),
        ),
      )
  }
  private def getLastPaidInvoiceAmount(items: List[InvoiceItem]) = getLastPaidInvoice(items: List[InvoiceItem]).map {
    case (invoiceId, invoiceItems) =>
      invoiceItems.map(invoice => invoice.ChargeAmount + invoice.TaxAmount).sum
  }
  private def getInvoicesSortedByDate(items: List[InvoiceItem]): Map[String, List[InvoiceItem]] = {
    val invoices: Map[String, List[InvoiceItem]] = items.groupBy(_.InvoiceId)
    ListMap(invoices.toSeq.sortWith(getDate(_) > getDate(_)): _*)
  }
  private def getDate(i: (String, List[InvoiceItem])) =
    i._2.headOption.map(_.chargeDateAsDateTime).getOrElse(LocalDateTime.MIN)

  case class PostBody(queryString: String)
  case class TaxationItem(Id: String, InvoiceId: String, InvoiceItemId: String)
  case class TaxationItems(records: List[TaxationItem])
  case class InvoiceItem(
      Id: String,
      AppliedToInvoiceItemId: Option[String] = None,
      ChargeDate: String,
      ChargeAmount: BigDecimal,
      TaxAmount: BigDecimal,
      InvoiceId: String,
  ) {
    def chargeDateAsDateTime = LocalDateTime.parse(ChargeDate, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
  }
  case class InvoiceItemsResponse(records: List[InvoiceItem])
  given JsonDecoder[InvoiceItem] = DeriveJsonDecoder.gen[InvoiceItem]
  given JsonDecoder[InvoiceItemsResponse] = DeriveJsonDecoder.gen[InvoiceItemsResponse]
  given JsonEncoder[PostBody] = DeriveJsonEncoder.gen[PostBody]
  given JsonDecoder[TaxationItems] = DeriveJsonDecoder.gen[TaxationItems]
  given JsonDecoder[TaxationItem] = DeriveJsonDecoder.gen[TaxationItem]
}

trait GetRefundInvoiceDetails {
  def get(subscriptionName: SubscriptionName): Task[RefundInvoiceDetails]
}
case class RefundInvoiceDetails(
    refundAmount: BigDecimal,
    negativeInvoiceId: String,
    negativeInvoiceItems: List[InvoiceItemWithTaxDetails],
)
case class TaxDetails(amount: BigDecimal, taxationId: String)
case class InvoiceItemWithTaxDetails(
    Id: String,
    AppliedToInvoiceItemId: Option[String] = None,
    ChargeDate: String,
    ChargeAmount: BigDecimal,
    TaxDetails: Option[TaxDetails],
    InvoiceId: String,
) {
  def taxAmount = TaxDetails.map(_.amount).getOrElse(BigDecimal(0))
  def amountWithTax = ChargeAmount + taxAmount
  def chargeDateAsDate = LocalDate.parse(ChargeDate, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
}

object GetRefundInvoiceDetails {
  def get(
      subscriptionName: SubscriptionName,
  ): RIO[GetRefundInvoiceDetails, RefundInvoiceDetails] =
    ZIO.serviceWithZIO[GetRefundInvoiceDetails](_.get(subscriptionName))
}
