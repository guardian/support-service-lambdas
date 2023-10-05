package com.gu.holidaystopprocessor

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.util.config.Stage
import com.gu.zuora.subscription.{CreditProduct, RatePlan}

/** Same Discount holiday stop product is reused for all products, namely: 'DO NOT USE MANUALLY: Holiday Credit -
  * automated'
  *
  * https://www.zuora.com/apps/Product.do?method=view&id=2c92a0ff5345f9200153559c6d2a3385#ST_DO%20NOT%20USE%20MANUALLY:%20Holiday%20Credit%20-%20automated
  */
object HolidayCreditProduct {

  final val ProductRatePlanChargeName: String = "Holiday Credit"

  object Prod {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
      productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6",
      ProductRatePlanChargeName,
    )

    val Voucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92a0117468816901748bdb3a8c1ac4",
      productRatePlanChargeId = "2c92a0117468816901748bdb3aab1ac6",
      ProductRatePlanChargeName,
    )

    val DigitalVoucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92a0fe750b35d001750d4522f43817",
      productRatePlanChargeId = "2c92a0fe750b35d001750d4523103819",
      ProductRatePlanChargeName,
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92a00f7468817d01748bd88f0d1d6c",
      productRatePlanChargeId = "2c92a00f7468817d01748bd88f2e1d6e",
      ProductRatePlanChargeName,
    )

    val NationalDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "TBD",
      productRatePlanChargeId = "TBC",
      ProductRatePlanChargeName,
    )
  }

  object Code {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
      productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4",
      ProductRatePlanChargeName,
    )

    val Voucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f8736c34b901737160f7df3a97",
      productRatePlanChargeId = "2c92c0f8736c34b901737160f7f63a99",
      ProductRatePlanChargeName,
    )

    val DigitalVoucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f9750689ea01750d7cabf44c38",
      productRatePlanChargeId = "2c92c0f9750689ea01750d7cac184c3b",
      ProductRatePlanChargeName,
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f8736c34cb01737160e5e469de",
      productRatePlanChargeId = "2c92c0f8736c34cb01737160e5fa69e0",
      ProductRatePlanChargeName,
    )

    // DO NOT USE MANUALLY: Delivery-problem credit - automated - National Delivery (CODE)
    val NationalDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "8ad08ad58aff62ad018aff6fbea80016",
      productRatePlanChargeId = "8ad08ad58aff62ad018aff6fc5fd005e",
      ProductRatePlanChargeName,
    )
  }

  /** <p>Determines which CreditProduct is applicable for the given subscription in the given deployment stage.</p>
    *
    * <p>This method works on the assumption that a subscription can only ever be for a single type of product. So a
    * Guardian Weekly sub can't be converted to a Voucher sub for instance. Then it doesn't matter how often a sub is
    * renewed or discounts added to it, there will only ever be one holiday credit product that can be applied to
    * it.</p>
    *
    * @param stage
    *   Dev, Code or Prod; any other value is taken to be Dev
    * @return
    *   Subscription => CreditProduct, which is resolved to a CreditProduct later when the subscription is available
    * @throws IllegalArgumentException
    *   when the given subscription has no applicable credit product
    */
  def forStage(stage: Stage): CreditProductForSubscription = {

    def creditProduct(stage: Stage)(plan: RatePlan): Option[CreditProduct] = (stage, plan.productName) match {
      case (Stage.Prod, s"Guardian Weekly$_") => Some(HolidayCreditProduct.Prod.GuardianWeekly)
      case (Stage.Prod, "Newspaper Delivery") => Some(HolidayCreditProduct.Prod.HomeDelivery)
      case (Stage.Prod, "Newspaper Voucher") => Some(HolidayCreditProduct.Prod.Voucher)
      case (Stage.Prod, "Newspaper Digital Voucher") => Some(HolidayCreditProduct.Prod.DigitalVoucher)
      case (Stage.Prod, "Newspaper - National Delivery") => Some(HolidayCreditProduct.Prod.NationalDelivery)
      case (Stage.Code, s"Guardian Weekly$_") => Some(HolidayCreditProduct.Code.GuardianWeekly)
      case (Stage.Code, "Newspaper Delivery") => Some(HolidayCreditProduct.Code.HomeDelivery)
      case (Stage.Code, "Newspaper Voucher") => Some(HolidayCreditProduct.Code.Voucher)
      case (Stage.Code, "Newspaper Digital Voucher") => Some(HolidayCreditProduct.Code.DigitalVoucher)
      case (Stage.Code, "Newspaper - National Delivery") => Some(HolidayCreditProduct.Code.NationalDelivery)
      case _ => None
    }

    subscription =>
      subscription.ratePlans
        .flatMap(creditProduct(stage))
        .headOption
        .getOrElse(
          throw new IllegalArgumentException(
            s"No holiday credit product available for subscription ${subscription.subscriptionNumber}",
          ),
        )
  }
}
