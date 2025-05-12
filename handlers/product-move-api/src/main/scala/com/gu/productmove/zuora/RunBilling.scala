package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
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

object RunBillingLive {
  val layer: URLayer[ZuoraGet, RunBilling] =
    ZLayer.fromFunction(RunBillingLive(_))
}

private class RunBillingLive(zuoraGet: ZuoraGet) extends RunBilling {

  // https://developer.zuora.com/v1-api-reference/older-api/operation/Action_POSTgenerate/
  override def run(accountId: ZuoraAccountId, today: LocalDate): Task[InvoiceId] =
    zuoraGet
      .post[RunBillingRequest, RunBillingResponse](
        uri"action/generate",
        RunBillingRequest(List(AccountToGenerate(accountId, today, today)), "Invoice"),
        ZuoraRestBody.ZuoraSuccessCheck.SuccessCheckCapitalised,
      )
      .map(_.Id)
      .map(InvoiceId.apply)

  private case class AccountToGenerate(AccountId: ZuoraAccountId, InvoiceDate: LocalDate, TargetDate: LocalDate)
      derives JsonEncoder
  private case class RunBillingRequest(objects: List[AccountToGenerate], `type`: String) derives JsonEncoder

  private case class RunBillingResponse(
      Id: String, // ID of the generated invoice
  ) derives JsonDecoder
}

trait RunBilling {
  def run(accountId: ZuoraAccountId, today: LocalDate): Task[InvoiceId]
}

object RunBilling {

  case class InvoiceId(id: String)

}
