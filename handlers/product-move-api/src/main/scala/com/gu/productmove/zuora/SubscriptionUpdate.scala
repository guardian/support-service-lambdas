package com.gu.productmove.zuora

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.*
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.productmove.AwsS3
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.util.config
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.json.ast.Json
import zio.json.internal.Write
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

trait SubscriptionUpdate:
  def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): ZIO[Stage, ErrorResponse, R]

object SubscriptionUpdateLive:
  val layer: URLayer[ZuoraGet, SubscriptionUpdate] = ZLayer.fromFunction(SubscriptionUpdateLive(_))

private class SubscriptionUpdateLive(zuoraGet: ZuoraGet) extends SubscriptionUpdate:
  override def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): ZIO[Stage, ErrorResponse, R] = {
    zuoraGet.put[SubscriptionUpdateRequest, R](
      uri"subscriptions/${subscriptionName.value}",
      requestBody,
    )
  }

object SubscriptionUpdate {
  def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): ZIO[SubscriptionUpdate with Stage, ErrorResponse, R] =
    ZIO.serviceWithZIO[SubscriptionUpdate](_.update[R](subscriptionName, requestBody))
}

sealed trait SubscriptionUpdateRequest
case class SwitchProductUpdateRequest(
    add: List[AddRatePlan],
    remove: List[RemoveRatePlan],
    collect: Option[Boolean] = None,
    runBilling: Option[Boolean] = None,
    preview: Option[Boolean] = None,
    targetDate: Option[LocalDate] = None,
    currentTerm: Option[String] = None,
    currentTermPeriodType: Option[String] = None,
) extends SubscriptionUpdateRequest

case class UpdateSubscriptionAmount(
    update: List[UpdateSubscriptionAmountItem],
) extends SubscriptionUpdateRequest

case class UpdateSubscriptionAmountItem(
    contractEffectiveDate: LocalDate,
    customerAcceptanceDate: LocalDate,
    serviceActivationDate: LocalDate,
    ratePlanId: String,
    chargeUpdateDetails: List[ChargeUpdateDetails],
)

case class ChargeUpdateDetails(
    price: BigDecimal,
    ratePlanChargeId: String,
)

case class AddRatePlan(
    contractEffectiveDate: LocalDate,
    productRatePlanId: String,
    chargeOverrides: List[ChargeOverrides],
)

case class RemoveRatePlan(
    contractEffectiveDate: LocalDate,
    ratePlanId: String,
)

case class SubscriptionUpdateResponse(
    subscriptionId: String,
    totalDeltaMrr: BigDecimal,
    invoiceId: Option[String],
    paidAmount: Option[BigDecimal],
)

case class SubscriptionUpdatePreviewResponse(invoice: SubscriptionUpdateInvoice)

case class SubscriptionUpdateInvoiceItem(
    serviceStartDate: LocalDate,
    chargeAmount: BigDecimal,
    taxAmount: BigDecimal,
    productRatePlanChargeId: String,
) {
  val totalAmount: BigDecimal = chargeAmount + taxAmount
}

case class SubscriptionUpdateInvoice(
    amount: BigDecimal,
    amountWithoutTax: BigDecimal,
    taxAmount: BigDecimal,
    invoiceItems: List[SubscriptionUpdateInvoiceItem],
)

given JsonEncoder[SubscriptionUpdateRequest] with {
  override def unsafeEncode(request: SubscriptionUpdateRequest, indent: Option[Int], out: Write): Unit = {
    request match {
      case z: SwitchProductUpdateRequest =>
        summon[JsonEncoder[SwitchProductUpdateRequest]].unsafeEncode(z, indent, out)
      case y: UpdateSubscriptionAmount =>
        summon[JsonEncoder[UpdateSubscriptionAmount]].unsafeEncode(y, indent, out)
    }
  }
}

given JsonEncoder[SwitchProductUpdateRequest] = DeriveJsonEncoder.gen[SwitchProductUpdateRequest]
given JsonEncoder[UpdateSubscriptionAmountItem] = DeriveJsonEncoder.gen[UpdateSubscriptionAmountItem]

given JsonEncoder[ChargeUpdateDetails] = DeriveJsonEncoder.gen[ChargeUpdateDetails]
given JsonEncoder[UpdateSubscriptionAmount] = DeriveJsonEncoder.gen[UpdateSubscriptionAmount]
given JsonDecoder[SubscriptionUpdateResponse] = DeriveJsonDecoder.gen[SubscriptionUpdateResponse]
given JsonDecoder[SubscriptionUpdatePreviewResponse] = DeriveJsonDecoder.gen[SubscriptionUpdatePreviewResponse]
given JsonDecoder[SubscriptionUpdateInvoice] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoice]
given JsonDecoder[SubscriptionUpdateInvoiceItem] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoiceItem]
given JsonEncoder[AddRatePlan] = DeriveJsonEncoder.gen[AddRatePlan]
given JsonEncoder[RemoveRatePlan] = DeriveJsonEncoder.gen[RemoveRatePlan]
