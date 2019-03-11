package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.util.config.LoadConfigModule.{S3Location, StringFromS3}
import com.gu.util.config.ZuoraEnvironment
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json
import ZuoraCatalogWireModel._
import com.gu.i18n.Currency

import scala.util.Try

case class PlanWithPrice(planId: PlanId, priceMinorUnits: Map[Currency, AmountMinorUnits])

object ZuoraCatalogWireModel {

  case class Price(price: Option[Double], currency: String)

  object Price {
    implicit val reads = Json.reads[Price]
  }

  case class RateplanCharge(
    pricing: List[Price]
  )

  object RateplanCharge {
    implicit val reads = Json.reads[RateplanCharge]
  }

  def toMinorUnits(amount: Double) = AmountMinorUnits((amount * 100).toInt)

  def parsedPriceRow(price: Price): Option[(Currency, AmountMinorUnits)] = for {
    amount <- price.price
    parsedCurrency <- Currency.fromString(price.currency)
  } yield parsedCurrency -> toMinorUnits(amount)

  def sumPrices(prices: Seq[Price]): Option[AmountMinorUnits] = {

    def doubleToMinorUnitsInt(amount: Double): Int = (amount * 100).toInt
    val optionalAmounts: Seq[Option[Double]] = prices.map(_.price)
    val allAmounts = optionalAmounts.flatten.map(doubleToMinorUnitsInt)
    if (allAmounts.isEmpty) None else
      Some(AmountMinorUnits(allAmounts.sum))
  }

  case class Rateplan(
    id: String,
    productRatePlanCharges: List[RateplanCharge]
  ) {
    def toParsedPlan(planIdFor: ProductRatePlanId => Option[PlanId]): Option[PlanWithPrice] = {
      val maybePlanId = planIdFor(ProductRatePlanId(id))

      maybePlanId map { planId =>
        val allPrices: Seq[Price] = for {
          charge <- productRatePlanCharges
          price <- charge.pricing
        } yield price

        val optionaltotalPricesByCurrency = allPrices.groupBy(_.currency).map {
          case (currencyString, prices) => for {
            parsedCurrency <- Currency.fromString(currencyString)
            totalAmount <- sumPrices(prices)
          } yield (parsedCurrency -> totalAmount)
        }

        val totalPricesByCurrency: Map[Currency, AmountMinorUnits] = optionaltotalPricesByCurrency.flatten.toMap

        PlanWithPrice(planId, totalPricesByCurrency)
      }
    }
  }

  object Rateplan {
    implicit val reads = Json.reads[Rateplan]

  }

  case class Product(
    id: String,
    productRatePlans: List[Rateplan]
  )

  object Product {
    implicit val reads = Json.reads[Product]
  }

  case class ZuoraCatalog(
    products: List[Product]
  ) {
    def toParsedPlans(planIdFor: ProductRatePlanId => Option[PlanId]): Map[PlanId, Map[Currency, AmountMinorUnits]] = {
      val plansWithPrice = for {
        product <- products
        rateplan <- product.productRatePlans
        parsedPlan <- rateplan.toParsedPlan(planIdFor).toList
      } yield parsedPlan

      plansWithPrice.map(x => x.planId -> x.priceMinorUnits).toMap
    }
  }

  object ZuoraCatalog {
    implicit val reads = Json.reads[ZuoraCatalog]
  }
}

object PricesFromZuoraCatalog {

  def apply(
    zuoraEnvironment: ZuoraEnvironment,
    fetchString: StringFromS3,
    planIdFor: ProductRatePlanId => Option[PlanId]
  ): ClientFailableOp[Map[PlanId, Map[Currency, AmountMinorUnits]]] = {

    val tryPrices = for {
      catalogString <- fetchString(S3Location(bucket = "gu-zuora-catalog", key = s"PROD/Zuora-${zuoraEnvironment.value}/catalog.json"))
      jsonCatalog <- Try(Json.parse(catalogString))
      wireCatalog <- Try(jsonCatalog.as[ZuoraCatalog])
      parsed = wireCatalog.toParsedPlans(planIdFor)
    } yield parsed

    tryPrices.toClientFailable(action = "get prices from zuora")
  }
}
