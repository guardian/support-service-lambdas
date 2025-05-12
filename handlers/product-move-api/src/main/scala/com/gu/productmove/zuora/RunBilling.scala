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

object RunBillingLive {
  val layer: URLayer[ZuoraGet, RunBilling] =
    ZLayer.fromFunction(RunBillingLive(_))
}

private class RunBillingLive(zuoraGet: ZuoraGet) extends RunBilling {
  
  override def get(accountId: ZuoraAccountId, today: LocalDate): Task[RefundInvoiceDetails] = {
    for {
      invoiceId <- zuoraGet
        .post[PostBody, InvoiceItemsResponse](
          uri"action/generate", // https://developer.zuora.com/v1-api-reference/older-api/operation/Action_POSTgenerate/
          PostBody(List(AccountToGenerate(accountId, today, today)), "Invoice"),
          ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckCapitalised,
        )
        .map(_.Id)
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
  /*PostBody is like this
{
"objects": [
{
"AccountId": "2c93808457d787030157e0306be53a75",
"InvoiceDate": "2016-10-20",
"TargetDate": "2016-10-20"
}
],
"type": "Invoice"
}
* */

  case class AccountToGenerate(AccountId: ZuoraAccountId, InvoiceDate: LocalDate, TargetDate: LocalDate) derives JsonEncoder
  case class PostBody(objects: List[AccountToGenerate], `type`: String) derives JsonEncoder
  
  case class InvoiceItemsResponse(
    Id: String, // ID of the generated invoice
  ) derives JsonDecoder
}

trait RunBilling {
  def get(subscriptionName: SubscriptionName): Task[Unit]
}

object RunBilling {
  def get(
      subscriptionName: SubscriptionName,
  ): RIO[RunBilling, RefundInvoiceDetails] =
    ZIO.serviceWithZIO[RunBilling](_.get(subscriptionName))
}
