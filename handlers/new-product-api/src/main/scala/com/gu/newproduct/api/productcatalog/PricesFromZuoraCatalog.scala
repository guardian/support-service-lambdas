package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.util.config.LoadConfigModule.{S3Location, StringFromS3}
import com.gu.util.config.ZuoraEnvironment
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json
import ZuoraCatalogWireModel._
import com.gu.newproduct.api.addsubscription.AmountMinorUnits

import scala.util.Try

case class PlanWithPrice(planId: PlanId, priceMinorUnits: AmountMinorUnits)

object ZuoraCatalogWireModel {

  case class Price(price: Option[Double], currency: String)

  object Price {
    implicit val reads = Json.reads[Price]
  }

  case class RateplanCharge(
    id: String,
    pricing: List[Price]
  )

  object RateplanCharge {
    implicit val reads = Json.reads[RateplanCharge]
  }

  def toMinorUnits(amount: Double) = AmountMinorUnits((amount * 100).toInt)

  case class Rateplan(
    id: String,
    productRatePlanCharges: List[RateplanCharge]
  ) {
    def toParsedPlan(planIdFor: ProductRatePlanId => Option[PlanId]): Option[PlanWithPrice] = {
      val maybePlanId = planIdFor(ProductRatePlanId(id))

      maybePlanId flatMap { planId =>

        val allPrices = for {
          charge <- productRatePlanCharges
          price <- charge.pricing
        } yield price

        val gbpAmounts = allPrices.collect { case Price(Some(amount), "GBP") => amount }
        val totalPrice = if (gbpAmounts.isEmpty) None else Some(toMinorUnits(gbpAmounts.sum))
        totalPrice.map(price => PlanWithPrice(planId, price))
      }
    }
  }

  object Rateplan {
    implicit val reads = Json.reads[Rateplan]

  }

  case class Product(
    id: String,
    name: String,
    ProductType__c: Option[String],
    productRatePlans: List[Rateplan]
  )

  object Product {
    implicit val reads = Json.reads[Product]
  }

  case class ZuoraCatalog(
    products: List[Product]
  ) {
    def toParsedPlans(planIdFor: ProductRatePlanId => Option[PlanId]): Map[PlanId, AmountMinorUnits] = {
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
  ): ClientFailableOp[Map[PlanId, AmountMinorUnits]] = {

    val tryPrices = for {
      catalogString <- fetchString(S3Location(bucket = "gu-zuora-catalog", key = s"PROD/Zuora-${zuoraEnvironment.value}/catalog.json"))
      jsonCatalog <- Try(Json.parse(catalogString))
      wireCatalog <- Try(jsonCatalog.as[ZuoraCatalog])
      parsed = wireCatalog.toParsedPlans(planIdFor)
    } yield parsed

    tryPrices.toClientFailable(action = "get prices from zuora")
  }
}
