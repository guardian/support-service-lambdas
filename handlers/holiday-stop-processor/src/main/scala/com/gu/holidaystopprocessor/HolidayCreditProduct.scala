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

  private[holidaystopprocessor] case class HolidayCreditProductForStage(
      GuardianWeekly: CreditProduct,
      Voucher: CreditProduct,
      VoucherObserverOnly: CreditProduct,
      DigitalVoucher: CreditProduct,
      DigitalVoucherObserverOnly: CreditProduct,
      HomeDelivery: CreditProduct,
      HomeDeliveryObserverOnly: CreditProduct,
      NationalDelivery: CreditProduct,
  )

  private[holidaystopprocessor] val Prod: HolidayCreditProductForStage = HolidayCreditProductForStage(
    GuardianWeekly = CreditProduct(
      productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
      productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6",
    ),
    Voucher = CreditProduct(
      productRatePlanId = "2c92a0117468816901748bdb3a8c1ac4",
      productRatePlanChargeId = "2c92a0117468816901748bdb3aab1ac6",
    ),
    VoucherObserverOnly = CreditProduct(
      productRatePlanId = "8a12994695dbb387019610e3b64b4985",
      productRatePlanChargeId = "8a12994695dbb387019610e3b675498b",
    ),
    DigitalVoucher = CreditProduct(
      productRatePlanId = "2c92a0fe750b35d001750d4522f43817",
      productRatePlanChargeId = "2c92a0fe750b35d001750d4523103819",
    ),
    DigitalVoucherObserverOnly = CreditProduct(
      productRatePlanId = "8a12817595db977f019610de92e23fde",
      productRatePlanChargeId = "8a12817595db977f019610de93323fe9",
    ),
    HomeDelivery = CreditProduct(
      productRatePlanId = "2c92a00f7468817d01748bd88f0d1d6c",
      productRatePlanChargeId = "2c92a00f7468817d01748bd88f2e1d6e",
    ),
    HomeDeliveryObserverOnly = CreditProduct(
      productRatePlanId = "8a12994695dbb387019610e2556647ac",
      productRatePlanChargeId = "8a12994695dbb387019610e2559747ae",
    ),
    NationalDelivery = CreditProduct(
      productRatePlanId = "8a128e208aff0721018b003d0dfe59d9",
      productRatePlanChargeId = "8a128e208aff0721018b003d0e5959e0",
    ),
  )

  private[holidaystopprocessor] val Code: HolidayCreditProductForStage = HolidayCreditProductForStage(
    GuardianWeekly = CreditProduct(
      productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
      productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4",
    ),
    Voucher = CreditProduct(
      productRatePlanId = "2c92c0f8736c34b901737160f7df3a97",
      productRatePlanChargeId = "2c92c0f8736c34b901737160f7f63a99",
    ),
    VoucherObserverOnly = CreditProduct(
      productRatePlanId = "71a1383e252961a05cf63e2f8a7c0059",
      productRatePlanChargeId = "71a1383e252961a05cf63e2f8ac5005a",
    ),
    DigitalVoucher = CreditProduct(
      productRatePlanId = "2c92c0f9750689ea01750d7cabf44c38",
      productRatePlanChargeId = "2c92c0f9750689ea01750d7cac184c3b",
    ),
    DigitalVoucherObserverOnly = CreditProduct(
      productRatePlanId = "71a1166282d961a192563e2dedc80106",
      productRatePlanChargeId = "71a1166282d961a192563e2dee4b0107",
    ),
    HomeDelivery = CreditProduct(
      productRatePlanId = "2c92c0f8736c34cb01737160e5e469de",
      productRatePlanChargeId = "2c92c0f8736c34cb01737160e5fa69e0",
    ),
    HomeDeliveryObserverOnly = CreditProduct(
      productRatePlanId = "71a1166280e961a192563e2f5311019b",
      productRatePlanChargeId = "71a1166280e961a192563e2f533b019c",
    ),
    NationalDelivery = CreditProduct(
      productRatePlanId = "8ad08f068aff62a4018affd6efc7743c",
      productRatePlanChargeId = "8ad08f068aff62a4018affd6eff97440",
    ),
  )

  private val stages: Map[Stage, HolidayCreditProductForStage] = Map(
    Stage.Code -> Code,
    Stage.Prod -> Prod,
  )

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

    val creditProductForStage = stages.getOrElse(stage, throw new RuntimeException(s"stage $stage does not exist"))

    def creditProduct: PartialFunction[RatePlan, CreditProduct] = { plan =>
      (plan.productName, plan.ratePlanName) match {
        case (s"Guardian Weekly$_", _) => creditProductForStage.GuardianWeekly
        // We need to match 'Tier Three' here because that is what the product is called in Zuora,
        // however the delivery product we are doing a credit for is Guardian Weekly
        case ("Tier Three", _) => creditProductForStage.GuardianWeekly
        case ("Newspaper Delivery", "Sunday") => creditProductForStage.HomeDeliveryObserverOnly
        case ("Newspaper Delivery", _) => creditProductForStage.HomeDelivery
        case ("Newspaper Voucher", "Sunday") => creditProductForStage.VoucherObserverOnly
        case ("Newspaper Voucher", _) => creditProductForStage.Voucher
        case ("Newspaper Digital Voucher", "Sunday") => creditProductForStage.DigitalVoucherObserverOnly
        case ("Newspaper Digital Voucher", _) => creditProductForStage.DigitalVoucher
        case ("Newspaper - National Delivery", _) => creditProductForStage.NationalDelivery
      }
    }

    subscription =>
      subscription.ratePlans
        .flatMap(creditProduct.lift)
        .headOption
        .getOrElse(
          throw new IllegalArgumentException(
            s"No holiday credit product available for subscription ${subscription.subscriptionNumber}",
          ),
        )
  }
}
