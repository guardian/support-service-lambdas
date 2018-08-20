package com.gu.newproduct.api.productcatalog
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.util.config.LoadConfigModule.{S3Location, StringFromS3}
import com.gu.util.config.Stage
import play.api.libs.json.Json

import scala.util.Try

/*
TODO just for now we are just loading the price, we should try to also load plan and charge ids
 Not all products have frontend_id defined and we probably need something similar for the charges unless we are ok with assuming contributions will have only one charge
 */
//todo left price as string for now
case class PlanWithPrice(planId: PlanId, maybepriceMinorUnits: Option[AmountMinorUnits])

object ZuoraCatalogWireModel {

  case class Price(price: Option[Double], currency: String)

  object Price {
    implicit val reads = Json.reads[Price]
  }

  case class RateplanCharge(
    id: String,
    name: String,
    pricing: List[Price]
  )

  object RateplanCharge {
    implicit val reads = Json.reads[RateplanCharge]
  }

  case class Rateplan(
    id: String,
    name: String,
    FrontendId__c: Option[String],
    productRatePlanCharges: List[RateplanCharge]
  ) {
    def toParsedPlan(planIdFor: ProductRatePlanId => Option[PlanId]): Option[PlanWithPrice] = {
      val planId = planIdFor(ProductRatePlanId(id))

      planId map { planId =>
        def toMinorUnits(amount: Double) = AmountMinorUnits((amount * 100).toInt)

        val allPrices = for {
          charge <- productRatePlanCharges
          price <- charge.pricing
        } yield price

        val gbpAmounts = allPrices.collect { case Price(Some(amount), "GBP") => amount }
        val totalPrice = if (gbpAmounts.isEmpty) None else Some(toMinorUnits(gbpAmounts.sum))
        PlanWithPrice(planId, totalPrice)

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
    def toParsedPlans(planIdFor: ProductRatePlanId => Option[PlanId]): List[PlanWithPrice] = for {
      product <- products
      rateplan <- product.productRatePlans
      parsedPlan <- rateplan.toParsedPlan(planIdFor).toList
    } yield parsedPlan
  }

  object ZuoraCatalog {
    implicit val reads = Json.reads[ZuoraCatalog]
  }

}

object PricesFromZuoraCatalog {

  import ZuoraCatalogWireModel._

  def apply(
    stage: Stage,
    fetchString: StringFromS3,
    planIdFor: ProductRatePlanId => Option[PlanId]
  ): Try[List[PlanWithPrice]] = for {
    catalogString <- fetchString(S3Location(bucket = "gu-zuora-catalog", key = s"PROD/Zuora-${stage.value}/catalog.json"))
    jsonCatalog <- Try(Json.parse(catalogString))
    wireCatalog <- Try(jsonCatalog.as[ZuoraCatalog])
    parsed = wireCatalog.toParsedPlans(planIdFor)
  } yield parsed
}
