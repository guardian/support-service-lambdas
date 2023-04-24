package com.gu.productmove.zuora

import com.gu.effects.GetFromS3
import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.*
import com.gu.newproduct.api.productcatalog.PlanId.{
  AnnualSupporterPlus,
  AnnualSupporterPlusV2,
  MonthlySupporterPlus,
  MonthlySupporterPlusV2,
}
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
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.util.config
import com.gu.util.config.ZuoraEnvironment
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

val SwitchToV2SupporterPlus = false

trait SubscriptionUpdate:
  def update(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[Stage, String, SubscriptionUpdateResponse]

  def preview(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[Stage, String, PreviewResult]

object SubscriptionUpdateLive:
  val layer: URLayer[ZuoraGet, SubscriptionUpdate] = ZLayer.fromFunction(SubscriptionUpdateLive(_))

private class SubscriptionUpdateLive(zuoraGet: ZuoraGet) extends SubscriptionUpdate:
  override def update(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[Stage, String, SubscriptionUpdateResponse] = {
    for {
      requestBody <- SubscriptionUpdateRequest(billingPeriod, currency, ratePlanIdToRemove, price)
      response <- zuoraGet.put[SubscriptionUpdateRequest, SubscriptionUpdateResponse](
        uri"subscriptions/${subscriptionName.value}",
        requestBody,
      )
    } yield response
  }

  override def preview(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[Stage, String, PreviewResult] = {
    for {
      today <- Clock.currentDateTime.map(_.toLocalDate)

      requestBody <- SubscriptionUpdatePreviewRequest(
        billingPeriod,
        currency,
        ratePlanIdToRemove,
        price,
        today.plusMonths(13),
      )
      response <- zuoraGet.put[SubscriptionUpdatePreviewRequest, SubscriptionUpdatePreviewResponse](
        uri"subscriptions/${subscriptionName.value}",
        requestBody,
      )
      stage <- ZIO.service[Stage]
      supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(stage, billingPeriod))
      previewResult <- BuildPreviewResult.getPreviewResult(subscriptionName: SubscriptionName, response.invoice, supporterPlusRatePlanIds)
    } yield previewResult

  }

object SubscriptionUpdate {
  def update(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[SubscriptionUpdate with Stage, String, SubscriptionUpdateResponse] =
    ZIO.serviceWithZIO[SubscriptionUpdate](
      _.update(subscriptionName, billingPeriod, price, currency, ratePlanIdToRemove),
    )

  def preview(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[SubscriptionUpdate with Stage, String, PreviewResult] =
    ZIO.serviceWithZIO[SubscriptionUpdate](
      _.preview(subscriptionName, billingPeriod, price, currency, ratePlanIdToRemove),
    )
}

case class SubscriptionUpdateRequest(
    add: List[AddRatePlan],
    remove: List[RemoveRatePlan],
    collect: Boolean = true,
    runBilling: Boolean = true,
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
    invoiceId: String,
    paidAmount: Option[BigDecimal],
)

case class SubscriptionUpdatePreviewRequest(
    add: List[AddRatePlan],
    remove: List[RemoveRatePlan],
    preview: Boolean = true,
    targetDate: LocalDate,
    currentTerm: String = "24",
    currentTermPeriodType: String = "Month",
)

case class SubscriptionUpdatePreviewResponse(invoice: SubscriptionUpdateInvoice)

case class SubscriptionUpdateInvoiceItem(
    serviceStartDate: LocalDate,
    chargeAmount: BigDecimal,
    taxAmount: BigDecimal,
    productRatePlanChargeId: String,
) {
  val totalAmount = chargeAmount + taxAmount
}

case class SubscriptionUpdateInvoice(
    amount: BigDecimal,
    amountWithoutTax: BigDecimal,
    taxAmount: BigDecimal,
    invoiceItems: List[SubscriptionUpdateInvoiceItem],
)

case class SupporterPlusRatePlanIds(
    ratePlanId: String,
    subscriptionRatePlanChargeId: String,
    contributionRatePlanChargeId: Option[String],
)

object SubscriptionUpdateRequest {
  def apply(
      billingPeriod: BillingPeriod,
      currency: Currency,
      ratePlanIdToRemove: String,
      price: BigDecimal,
  ): ZIO[Stage, String, SubscriptionUpdateRequest] =
    getRatePlans(billingPeriod, currency, ratePlanIdToRemove, price).map { case (addRatePlan, removeRatePlan) =>
      SubscriptionUpdateRequest(addRatePlan, removeRatePlan)
    }
}

object SubscriptionUpdatePreviewRequest {
  def apply(
      billingPeriod: BillingPeriod,
      currency: Currency,
      ratePlanIdToRemove: String,
      price: BigDecimal,
      targetDate: LocalDate,
  ): ZIO[Stage, String, SubscriptionUpdatePreviewRequest] =
    getRatePlans(billingPeriod, currency, ratePlanIdToRemove, price).map { case (addRatePlan, removeRatePlan) =>
      SubscriptionUpdatePreviewRequest(add = addRatePlan, remove = removeRatePlan, targetDate = targetDate)
    }
}

private def getRatePlans(
    billingPeriod: BillingPeriod,
    currency: Currency,
    ratePlanIdToRemove: String,
    price: BigDecimal,
): ZIO[Stage, String, (List[AddRatePlan], List[RemoveRatePlan])] =
  for {
    date <- Clock.currentDateTime.map(_.toLocalDate)
    stage <- ZIO.service[Stage]
    supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(stage, billingPeriod))
    overrideAmount <- getContributionAmount(stage, price, currency, billingPeriod)
    chargeOverride = ChargeOverrides(
      price = Some(overrideAmount),
      productRatePlanChargeId = supporterPlusRatePlanIds.contributionRatePlanChargeId.getOrElse(
        supporterPlusRatePlanIds.subscriptionRatePlanChargeId,
      ),
    )
    addRatePlan = AddRatePlan(date, supporterPlusRatePlanIds.ratePlanId, chargeOverrides = List(chargeOverride))
    removeRatePlan = RemoveRatePlan(date, ratePlanIdToRemove)
  } yield (List(addRatePlan), List(removeRatePlan))

def getContributionAmount(
    stage: Stage,
    price: BigDecimal,
    currency: Currency,
    billingPeriod: BillingPeriod,
): IO[String, BigDecimal] =
  if (SwitchToV2SupporterPlus)
    // work out how much of what the user is paying can be treated as a contribution (total amount - cost of sub)
    val catalogPlanId =
      if (billingPeriod == Monthly)
        MonthlySupporterPlusV2
      else
        AnnualSupporterPlusV2
    ZIO.fromEither(
      getSubscriptionPriceInMinorUnits(stage, catalogPlanId, currency).map(subscriptionChargePrice =>
        price - (subscriptionChargePrice.value / 100),
      ),
    )
  else ZIO.succeed(price)

def getSubscriptionPriceInMinorUnits(
    stage: Stage,
    catalogPlanId: PlanId,
    currency: Currency,
): Either[String, AmountMinorUnits] =
  for {
    ratePlanToApiId <- zuoraIdsForStage(config.Stage(stage.toString)).map(_.rateplanIdToApiId)
    prices <- PricesFromZuoraCatalog(
      ZuoraEnvironment(stage.toString),
      GetFromS3.fetchString,
      ratePlanToApiId.get,
    ).toDisjunction.left.map(_.message)
  } yield prices(catalogPlanId)(currency)

def getSupporterPlusRatePlanIds(
    stage: Stage,
    billingPeriod: BillingPeriod,
): Either[String, SupporterPlusRatePlanIds] = {
  zuoraIdsForStage(config.Stage(stage.toString)).flatMap { zuoraIds =>
    import zuoraIds.supporterPlusZuoraIds.{annual, annualV2, monthly, monthlyV2}

    billingPeriod match {
      case Monthly if SwitchToV2SupporterPlus =>
        Right(
          SupporterPlusRatePlanIds(
            monthlyV2.productRatePlanId.value,
            monthlyV2.productRatePlanChargeId.value,
            Some(monthlyV2.contributionProductRatePlanChargeId.value),
          ),
        )
      case Monthly =>
        Right(
          SupporterPlusRatePlanIds(
            monthly.productRatePlanId.value,
            monthly.productRatePlanChargeId.value,
            None,
          ),
        )
      case Annual if SwitchToV2SupporterPlus =>
        Right(
          SupporterPlusRatePlanIds(
            annualV2.productRatePlanId.value,
            annualV2.productRatePlanChargeId.value,
            Some(annualV2.contributionProductRatePlanChargeId.value),
          ),
        )
      case Annual =>
        Right(
          SupporterPlusRatePlanIds(
            annual.productRatePlanId.value,
            annual.productRatePlanChargeId.value,
            None,
          ),
        )
      case _ => Left(s"error when matching on billingPeriod $billingPeriod")
    }
  }
}
given JsonEncoder[SubscriptionUpdateRequest] = DeriveJsonEncoder.gen[SubscriptionUpdateRequest]
given JsonEncoder[SubscriptionUpdatePreviewRequest] = DeriveJsonEncoder.gen[SubscriptionUpdatePreviewRequest]
given JsonDecoder[SubscriptionUpdateResponse] = DeriveJsonDecoder.gen[SubscriptionUpdateResponse]
given JsonDecoder[SubscriptionUpdatePreviewResponse] = DeriveJsonDecoder.gen[SubscriptionUpdatePreviewResponse]
given JsonDecoder[SubscriptionUpdateInvoice] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoice]
given JsonDecoder[SubscriptionUpdateInvoiceItem] = DeriveJsonDecoder.gen[SubscriptionUpdateInvoiceItem]
given JsonEncoder[AddRatePlan] = DeriveJsonEncoder.gen[AddRatePlan]
given JsonEncoder[RemoveRatePlan] = DeriveJsonEncoder.gen[RemoveRatePlan]
