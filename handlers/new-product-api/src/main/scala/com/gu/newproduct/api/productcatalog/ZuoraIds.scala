package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.config.Stage
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}

object ZuoraIds {

  case class ProductRatePlanId(value: String) extends AnyVal

  case class ProductRatePlanChargeId(value: String) extends AnyVal

  case class PlanAndCharge(productRatePlanId: ProductRatePlanId, productRatePlanChargeId: ProductRatePlanChargeId)

  case class ContributionsZuoraIds(monthly: PlanAndCharge, annual: PlanAndCharge) {
    val byApiPlanId: Map[PlanId, PlanAndCharge] = Map(
      MonthlyContribution -> monthly,
      AnnualContribution -> annual
    )
  }

    case class VoucherZuoraIds(
    everyday: ProductRatePlanId,
    saturday: ProductRatePlanId,
    sunday: ProductRatePlanId,
    weekend: ProductRatePlanId,
    sixDay: ProductRatePlanId,
    everydayPlus: ProductRatePlanId,
    saturdayPlus: ProductRatePlanId,
    sundayPlus: ProductRatePlanId,
    weekendPlus: ProductRatePlanId,
    sixDayPlus: ProductRatePlanId
  ) {

      val byApiPlanId: Map[PlanId, ProductRatePlanId] = Map(
      VoucherEveryDay -> everyday,
      VoucherWeekend -> weekend,
      VoucherSixDay -> sixDay,
      VoucherSunday -> sunday,
      VoucherSaturday -> saturday,
      VoucherEveryDayPlus -> everydayPlus,
      VoucherWeekendPlus -> weekendPlus,
      VoucherSixDayPlus -> sixDayPlus,
      VoucherSundayPlus -> sundayPlus,
      VoucherSaturdayPlus -> saturdayPlus
    )

    val plansWithDigipack = List(
      everydayPlus, weekendPlus, sixDayPlus, sundayPlus, saturdayPlus
    )
    val zuoraIdToPlanid = byApiPlanId.map(_.swap)

  }

  case class HomeDeliveryZuoraIds(
    everyday: ProductRatePlanId,
    everydayPlus: ProductRatePlanId,
    saturday:ProductRatePlanId,
    saturdayPlus:ProductRatePlanId,
    sunday: ProductRatePlanId,
    sundayPlus: ProductRatePlanId,
    weekend: ProductRatePlanId,
    weekendPlus: ProductRatePlanId,
    sixDay: ProductRatePlanId,
    sixDayPlus: ProductRatePlanId
  ) {
    val byApiPlanId: Map[PlanId, ProductRatePlanId] = Map(
      HomeDeliveryEveryDay -> everyday,
      HomeDeliveryWeekend -> weekend,
      HomeDeliverySixDay -> sixDay,
      HomeDeliverySaturday -> saturday,
      HomeDeliverySaturdayPlus -> saturdayPlus,
      HomeDeliverySunday -> sunday,
      HomeDeliveryEveryDayPlus -> everydayPlus,
      HomeDeliveryWeekendPlus -> weekendPlus,
      HomeDeliverySixDayPlus -> sixDayPlus,
      HomeDeliverySundayPlus -> sundayPlus,
    )

    val zuoraIdToPlanid = byApiPlanId.map(_.swap)

    val plansWithDigipack = List(
      everydayPlus, weekendPlus, sixDayPlus, sundayPlus, saturdayPlus
    )
  }

  case class DigipackZuoraIds(
    monthly: ProductRatePlanId,
    annual: ProductRatePlanId
  ) {
    val byApiPlanId = Map(
      DigipackAnnual -> annual,
      DigipackMonthly -> monthly
    )
    val zuoraIdToPlanid = byApiPlanId.map(_.swap)
  }

  case class ZuoraIds(contributionsZuoraIds: ContributionsZuoraIds, voucherZuoraIds: VoucherZuoraIds, homeDeliveryZuoraIds: HomeDeliveryZuoraIds, digitalPackIds: DigipackZuoraIds) {
    def apiIdToRateplanId: Map[PlanId, ProductRatePlanId] = contributionsZuoraIds.byApiPlanId.mapValues(_.productRatePlanId) ++ voucherZuoraIds.byApiPlanId ++ homeDeliveryZuoraIds.byApiPlanId ++ digitalPackIds.byApiPlanId

    val rateplanIdToApiId: Map[ProductRatePlanId, PlanId] = apiIdToRateplanId.map(_.swap)
  }

  def zuoraIdsForStage(stage: Stage): ApiGatewayOp[ZuoraIds] = {
    val mappings = Map(
      // todo ideally we should add an id to the fields in zuora so we don't have to hard code
      Stage("PROD") -> ZuoraIds(
        ContributionsZuoraIds(
          monthly = PlanAndCharge(
            ProductRatePlanId("2c92a0fc5aacfadd015ad24db4ff5e97"),
            ProductRatePlanChargeId("2c92a0fc5aacfadd015ad250bf2c6d38")
          ),
          annual = PlanAndCharge(
            ProductRatePlanId("2c92a0fc5e1dc084015e37f58c200eea"),
            ProductRatePlanChargeId("2c92a0fc5e1dc084015e37f58c7b0f34")
          )
        ),
        VoucherZuoraIds(
          everyday = ProductRatePlanId("2c92a0fd56fe270b0157040dd79b35da"),
          sunday = ProductRatePlanId("2c92a0fe5af9a6b9015b0fe1ecc0116c"),
          saturday = ProductRatePlanId("2c92a0fd6205707201621f9f6d7e0116"),
          weekend = ProductRatePlanId("2c92a0ff56fe33f00157040f9a537f4b"),
          sixDay = ProductRatePlanId("2c92a0fd56fe270b0157040e42e536ef"),
          everydayPlus = ProductRatePlanId("2c92a0ff56fe33f50157040bbdcf3ae4"),
          sundayPlus = ProductRatePlanId("2c92a0fe56fe33ff0157040d4b824168"),
          saturdayPlus = ProductRatePlanId("2c92a0fd6205707201621fa1350710e3"),
          weekendPlus = ProductRatePlanId("2c92a0fd56fe26b60157040cdd323f76"),
          sixDayPlus = ProductRatePlanId("2c92a0fc56fe26ba0157040c5ea17f6a")
        ),
        HomeDeliveryZuoraIds(
          everyday = ProductRatePlanId("2c92a0fd560d13880156136b72e50f0c"),
          sixDay = ProductRatePlanId("2c92a0ff560d311b0156136f2afe5315"),
          weekend = ProductRatePlanId("2c92a0fd5614305c01561dc88f3275be"),
          sunday = ProductRatePlanId("2c92a0ff5af9b657015b0fea5b653f81"),
          saturday = ProductRatePlanId("2c92a0fd5e1dcf0d015e3cb39d0a7ddb"),
          saturdayPlus= ProductRatePlanId("2c92a0ff6205708e01622484bb2c4613"),
          sundayPlus = ProductRatePlanId("2c92a0fd560d13880156136b8e490f8b"),
          weekendPlus = ProductRatePlanId("2c92a0ff560d311b0156136b9f5c3968"),
          sixDayPlus = ProductRatePlanId("2c92a0ff560d311b0156136b697438a9"),
          everydayPlus = ProductRatePlanId("2c92a0fd560d132301560e43cf041a3c")
        ),
        DigipackZuoraIds(
          monthly = ProductRatePlanId("2c92a0fb4edd70c8014edeaa4eae220a"),
          annual = ProductRatePlanId("2c92a0fb4edd70c8014edeaa4e972204"),
        )
      ),
      Stage("CODE") -> ZuoraIds(
        ContributionsZuoraIds(
          monthly = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("2c92c0f85ab269be015acd9d014549b7"),
            productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85ab2696b015acd9eeb6150ab")
          ),
          annual = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("2c92c0f95e1d5c9c015e38f8c87d19a1"),
            productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f95e1d5c9c015e38f8c8ac19a3")
          )
        ),
        VoucherZuoraIds(
          everyday = ProductRatePlanId("2c92c0f855c9f4b20155d9f1d3d4512a"),
          sunday = ProductRatePlanId("2c92c0f95aff3b54015b0ee0eb500b2e"),
          saturday = ProductRatePlanId("2c92c0f961f9cf300161fc02a7d805c9"),
          weekend = ProductRatePlanId("2c92c0f855c9f4b20155d9f1db9b5199"),
          sixDay = ProductRatePlanId("2c92c0f955ca02910155da254a641fb3"),
          everydayPlus = ProductRatePlanId("2c92c0f955ca02920155da240cdb4399"),
          sundayPlus = ProductRatePlanId("2c92c0f858aa38af0158b9dae19110a3"),
          saturdayPlus = ProductRatePlanId("2c92c0f961f9cf350161fc0454283f3e"),
          weekendPlus = ProductRatePlanId("2c92c0f855c9f4b20155d9f1dd0651ab"),
          sixDayPlus = ProductRatePlanId("2c92c0f855c9f4540155da2607db6402")
        ),
        HomeDeliveryZuoraIds(
          everyday = ProductRatePlanId("2c92c0f955ca02900155da27f55b2d5f"),
          sixDay = ProductRatePlanId("2c92c0f955ca02900155da27ff142e01"),
          weekend = ProductRatePlanId("2c92c0f955ca02900155da27f83c2d9b"),
          sunday = ProductRatePlanId("2c92c0f95aff3b54015b0ede33bc04f2"),
          sundayPlus = ProductRatePlanId("2c92c0f955ca02900155da27f4872d4d"),
          saturday = ProductRatePlanId("2c92c0f85b8fa30e015b9108a83253c7"),
          saturdayPlus = ProductRatePlanId("2c92c0f961f9cf300161fbfa943b6f54"),
          weekendPlus = ProductRatePlanId("2c92c0f955ca02900155da27f9402dad"),
          sixDayPlus = ProductRatePlanId("2c92c0f955ca02900155da27f29e2d13"),
          everydayPlus = ProductRatePlanId("2c92c0f955ca02900155da2803b02e33")
        ),
        DigipackZuoraIds(
          monthly = ProductRatePlanId("2c92c0f94f2acf73014f2c908f671591"),
          annual = ProductRatePlanId("2c92c0f84f2ac59d014f2c94aea9199e")
        )
      ),
      Stage("DEV") -> ZuoraIds(
        ContributionsZuoraIds(
          monthly = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("2c92c0f85a6b134e015a7fcd9f0c7855"),
            productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85a6b1352015a7fcf35ab397c")
          ),
          annual = PlanAndCharge(
            productRatePlanId = ProductRatePlanId("2c92c0f85e2d19af015e3896e824092c"),
            productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85e2d19af015e3896e84d092e")
          )
        ),
        VoucherZuoraIds(
          everyday = ProductRatePlanId("2c92c0f9555cf10501556e84a70440e2"),
          sunday = ProductRatePlanId("2c92c0f95aff3b56015b1045fb9332d2"),
          saturday = ProductRatePlanId("2c92c0f861f9c26d0161fc434bfe004c"),
          weekend = ProductRatePlanId("2c92c0f8555ce5cf01556e7f01b81b94"),
          sixDay = ProductRatePlanId("2c92c0f8555ce5cf01556e7f01771b8a"),
          everydayPlus = ProductRatePlanId("2c92c0f95aff3b53015b10469bbf5f5f"),
          sundayPlus = ProductRatePlanId("2c92c0f955a0b5bf0155b62623846fc8"),
          saturdayPlus = ProductRatePlanId("2c92c0f961f9cf300161fc44f2661258"),
          weekendPlus = ProductRatePlanId("2c92c0f95aff3b54015b1047efaa2ac3"),
          sixDayPlus = ProductRatePlanId("2c92c0f855c3b8190155c585a95e6f5a")
        ),
        HomeDeliveryZuoraIds(
          everyday = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9e2493c43"),
          sixDay = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9ddf13bc5"),
          weekend = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9df433bf7"),
          sunday = ProductRatePlanId("2c92c0f85aff3453015b1041dfd2317f"),
          sundayPlus = ProductRatePlanId("2c92c0f955c3cf0f0155c5d9e83a3cb7"),
          saturday = ProductRatePlanId("2c92c0f961f9cf300161fc4d2e3e3664"),
          saturdayPlus = ProductRatePlanId("2c92c0f961f9cf300161fc4f71473a34"),
          weekendPlus = ProductRatePlanId("2c92c0f95aff3b56015b104aa9a13ea5"),
          sixDayPlus = ProductRatePlanId("2c92c0f85aff33ff015b1042d4ba0a05"),
          everydayPlus = ProductRatePlanId("2c92c0f85aff3453015b10496b5e3d17")
        ),
        DigipackZuoraIds(
          monthly = ProductRatePlanId("2c92c0f84bbfec8b014bc655f4852d9d"),
          annual = ProductRatePlanId("2c92c0f94bbffaaa014bc6a4212e205b")
        )
      )
    )
    mappings.get(stage).toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"missing zuora ids for stage $stage"))
  }

}
