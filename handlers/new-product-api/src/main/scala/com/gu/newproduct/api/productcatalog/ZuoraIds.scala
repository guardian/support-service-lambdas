package com.gu.newproduct.api.productcatalog

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.config.Stage
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
object ZuoraIds {

  case class ProductRatePlanId(value: String) extends AnyVal

  case class ProductRatePlanChargeId(value: String) extends AnyVal

  case class PlanAndCharge(productRatePlanId: ProductRatePlanId, productRatePlanChargeId: ProductRatePlanChargeId)

  case class ContributionsZuoraIds(monthly: PlanAndCharge, annual: PlanAndCharge)

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

    val zuoraIdToPlanid = byApiPlanId.map(_.swap)

  }

  case class ZuoraIds(contributionsZuoraIds: ContributionsZuoraIds, voucherZuoraIds: VoucherZuoraIds)

  def zuoraIdsForStage(stage: Stage): ApiGatewayOp[ZuoraIds] = {
    val mappings = Map(
      // todo ideally we should add an id to the fields in zuea"),
      //            ProductRatePlanChargeId("2c92a0fc5e1dc084015e37f5ora so we don't have to hard code
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

        )
      )
    )
    mappings.get(stage).toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"missing zuora ids for stage $stage"))
  }

}
