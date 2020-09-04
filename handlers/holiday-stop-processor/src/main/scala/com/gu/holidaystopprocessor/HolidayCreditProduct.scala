package com.gu.holidaystopprocessor

import com.gu.creditprocessor.Processor.CreditProductForSubscription
import com.gu.util.config.Stage
import com.gu.zuora.subscription.{CreditProduct, RatePlan, RatePlanCharge}

/**
 * Same Discount holiday stop product is reused for all products, namely:
 *   'DO NOT USE MANUALLY: Holiday Credit - automated'
 *
 *   https://www.zuora.com/apps/Product.do?method=view&id=2c92a0ff5345f9200153559c6d2a3385#ST_DO%20NOT%20USE%20MANUALLY:%20Holiday%20Credit%20-%20automated
 */
object HolidayCreditProduct {

  val productRatePlanChargeName = "Holiday Credit"

  val Prod = CreditProduct(
    productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
    productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6",
    productRatePlanChargeName
  )

  val Code = CreditProduct(
    productRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
    productRatePlanChargeId = "2c92c0f86b0378b0016b08112ec70d14",
    productRatePlanChargeName
  )

  object Dev {

    val GuardianWeekly: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
      productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4",
      productRatePlanChargeName
    )

    val Voucher: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f8736c34b901737160f7df3a97",
      productRatePlanChargeId = "2c92c0f8736c34b901737160f7f63a99",
      productRatePlanChargeName
    )

    val VoucherPlus: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f973e676bf0173e787dd8662c2",
      productRatePlanChargeId = "2c92c0f973e676bf0173e787ddac62c4",
      productRatePlanChargeName
    )

    val HomeDelivery: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f8736c34cb01737160e5e469de",
      productRatePlanChargeId = "2c92c0f8736c34cb01737160e5fa69e0",
      productRatePlanChargeName
    )

    val HomeDeliveryPlus: CreditProduct = CreditProduct(
      productRatePlanId = "2c92c0f873e665fb0173e78129692272",
      productRatePlanChargeId = "2c92c0f873e665fb0173e78129832274",
      productRatePlanChargeName
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

    def isPlus(plan: RatePlan) = plan.ratePlanName.endsWith("+")
    def isGuardianWeekly(plan: RatePlan) = plan.productName.startsWith("Guardian Weekly")
    def isHomeDelivery(plan: RatePlan) = plan.productName == "Newspaper Delivery"
    def isHomeDeliveryPlus(plan: RatePlan) = isHomeDelivery(plan) && isPlus(plan)
    def isVoucher(plan: RatePlan) = plan.productName == "Newspaper Voucher" || plan.productName == "Newspaper Digital Voucher"
    def isVoucherPlus(plan: RatePlan) = isVoucher(plan) && isPlus(plan)

    stage match {
      case Stage("PROD") => _ => HolidayCreditProduct.Prod
      case Stage("CODE") => _ => HolidayCreditProduct.Code
      case _ => subscription =>
        if (subscription.ratePlans.exists(isGuardianWeekly)) HolidayCreditProduct.Dev.GuardianWeekly
        else if (subscription.ratePlans.exists(isHomeDeliveryPlus)) HolidayCreditProduct.Dev.HomeDeliveryPlus
        else if (subscription.ratePlans.exists(isHomeDelivery)) HolidayCreditProduct.Dev.HomeDelivery
        else if (subscription.ratePlans.exists(isVoucherPlus)) HolidayCreditProduct.Dev.VoucherPlus
        else if (subscription.ratePlans.exists(isVoucher)) HolidayCreditProduct.Dev.Voucher
        else throw new IllegalArgumentException(s"No holiday credit product available for subscription ${subscription.subscriptionNumber}")
    }
  }
}
