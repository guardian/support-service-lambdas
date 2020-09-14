package com.gu.holidaystopprocessor

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.util.config.Stage
import com.gu.zuora.subscription.{CreditProduct, RatePlan}

/**
 * Same Discount holiday stop product is reused for all products, namely:
 * 'DO NOT USE MANUALLY: Holiday Credit - automated'
 *
 * https://www.zuora.com/apps/Product.do?method=view&id=2c92a0ff5345f9200153559c6d2a3385#ST_DO%20NOT%20USE%20MANUALLY:%20Holiday%20Credit%20-%20automated
 */
object HolidayCreditProduct {

  final val ProductRatePlanChargeName: String = "Holiday Credit"

  val Prod: CreditProduct = CreditProduct(
    productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
    productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6",
    ProductRatePlanChargeName
  )

  object Code {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
      productRatePlanChargeId = "2c92c0f86b0378b0016b08112ec70d14",
      ProductRatePlanChargeName
    )

    val Voucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f87466eaa2017467be65222246",
      productRatePlanChargeId = "2c92c0f87466eaa2017467be659e2248",
      ProductRatePlanChargeName
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f97466f60b017467c6e02707b0",
      productRatePlanChargeId = "2c92c0f97466f60b017467c6e04407b3",
      ProductRatePlanChargeName
    )
  }

  object Dev {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
      productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4",
      ProductRatePlanChargeName
    )

    val Voucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f8736c34b901737160f7df3a97",
      productRatePlanChargeId = "2c92c0f8736c34b901737160f7f63a99",
      ProductRatePlanChargeName
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f8736c34cb01737160e5e469de",
      productRatePlanChargeId = "2c92c0f8736c34cb01737160e5fa69e0",
      ProductRatePlanChargeName
    )
  }

  /**
   * <p>Determines which CreditProduct is applicable for the given subscription
   * in the given deployment stage.</p>
   *
   * <p>This method works on the assumption that a subscription can only ever be
   * for a single type of product.
   * So a Guardian Weekly sub can't be converted to a Voucher sub for instance.
   * Then it doesn't matter how often a sub is renewed or discounts added to it, there will only
   * ever be one holiday credit product that can be applied to it.</p>
   *
   * @param stage Dev, Code or Prod; any other value is taken to be Dev
   * @return Subscription => CreditProduct, which is resolved to a CreditProduct later
   *         when the subscription is available
   * @throws IllegalArgumentException when the given subscription has no applicable credit product
   */
  def forStage(stage: Stage): CreditProductForSubscription = {

    def creditProduct(stage: Stage)(plan: RatePlan): Option[CreditProduct] = (stage, plan.productName) match {
      case (Stage.Prod, _) => Some(HolidayCreditProduct.Prod)
      case (Stage.Code, s"Guardian Weekly$_") => Some(HolidayCreditProduct.Code.GuardianWeekly)
      case (Stage.Code, "Newspaper Delivery") => Some(HolidayCreditProduct.Code.HomeDelivery)
      case (Stage.Code, "Newspaper Voucher" | "Newspaper Digital Voucher") => Some(HolidayCreditProduct.Code.Voucher)
      case (_, s"Guardian Weekly$_") => Some(HolidayCreditProduct.Dev.GuardianWeekly)
      case (_, "Newspaper Delivery") => Some(HolidayCreditProduct.Dev.HomeDelivery)
      case (_, "Newspaper Voucher" | "Newspaper Digital Voucher") => Some(HolidayCreditProduct.Dev.Voucher)
      case _ => None
    }

    subscription =>
      subscription
        .ratePlans
        .flatMap(creditProduct(stage))
        .headOption
        .getOrElse(
          throw new IllegalArgumentException(
            s"No holiday credit product available for subscription ${subscription.subscriptionNumber}"
          )
        )
  }
}
