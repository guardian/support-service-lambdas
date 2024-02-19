package com.gu.productmove.zuora

import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.client3.*
import zio.json.*
import zio.json.internal.Write
import zio.{RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

trait SubscriptionUpdate:
  def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): Task[R]

object SubscriptionUpdateLive:
  val layer: URLayer[ZuoraGet, SubscriptionUpdate] = ZLayer.fromFunction(SubscriptionUpdateLive(_))

class SubscriptionUpdateLive(zuoraGet: ZuoraGet) extends SubscriptionUpdate:
  override def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): Task[R] = {
    zuoraGet.put[SubscriptionUpdateRequest, R](
      uri"subscriptions/${subscriptionName.value}",
      requestBody,
    )
  }

object SubscriptionUpdate {
  def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): RIO[SubscriptionUpdate, R] =
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
    derives JsonEncoder

case class UpdateSubscriptionAmount(
    update: List[UpdateSubscriptionAmountItem],
) extends SubscriptionUpdateRequest
    derives JsonEncoder

case class UpdateSubscriptionAmountItem(
    contractEffectiveDate: LocalDate,
    customerAcceptanceDate: LocalDate,
    serviceActivationDate: LocalDate,
    ratePlanId: String,
    chargeUpdateDetails: List[ChargeUpdateDetails],
) derives JsonEncoder

case class ChargeUpdateDetails(
    price: BigDecimal,
    ratePlanChargeId: String,
) derives JsonEncoder

case class AddRatePlan(
    contractEffectiveDate: LocalDate,
    productRatePlanId: String,
    chargeOverrides: List[ChargeOverrides],
) derives JsonEncoder

case class RemoveRatePlan(
    contractEffectiveDate: LocalDate,
    ratePlanId: String,
) derives JsonEncoder

case class SubscriptionUpdateResponse(
    subscriptionId: String,
    totalDeltaMrr: BigDecimal,
    invoiceId: Option[String],
    paidAmount: Option[BigDecimal],
) derives JsonDecoder

case class SubscriptionUpdatePreviewResponse(invoice: SubscriptionUpdateInvoice) derives JsonDecoder

case class SubscriptionUpdateInvoiceItem(
    serviceStartDate: LocalDate,
    chargeAmount: BigDecimal,
    taxAmount: BigDecimal,
    productRatePlanChargeId: String,
) derives JsonDecoder {
  val totalAmount: BigDecimal = chargeAmount + taxAmount
}

case class SubscriptionUpdateInvoice(
    amount: BigDecimal,
    amountWithoutTax: BigDecimal,
    taxAmount: BigDecimal,
    invoiceItems: List[SubscriptionUpdateInvoiceItem],
) derives JsonDecoder

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
