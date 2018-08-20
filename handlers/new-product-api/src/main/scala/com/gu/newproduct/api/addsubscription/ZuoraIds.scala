package com.gu.newproduct.api.addsubscription

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.config.Stage
import com.gu.util.reader.Types.{ApiGatewayOp, _}

object ZuoraIds {

  case class ProductRatePlanId(value: String) extends AnyVal
  case class ProductRatePlanChargeId(value: String) extends AnyVal
  case class PlanAndCharge(productRatePlanId: ProductRatePlanId, productRatePlanChargeId: ProductRatePlanChargeId)
  case class ContributionsZuoraIds(monthly: PlanAndCharge, annual: PlanAndCharge)

  def zuoraIdsForStage(stage: Stage): ApiGatewayOp[ContributionsZuoraIds] = {
    val mappings = Map(
      // todo ideally we should add an id to the fields in zuora so we don't have to hard code
      Stage("PROD") -> ContributionsZuoraIds(
        monthly = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92a0fc5aacfadd015ad24db4ff5e97"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92a0fc5aacfadd015ad250bf2c6d38")
        ),
        annual = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92a0fc5e1dc084015e37f58c200eea"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92a0fc5e1dc084015e37f58c7b0f34")
        )
      ),
      Stage("CODE") -> ContributionsZuoraIds(
        monthly = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92c0f85ab269be015acd9d014549b7"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85ab2696b015acd9eeb6150ab")
        ),
        annual = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92c0f95e1d5c9c015e38f8c87d19a1"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f95e1d5c9c015e38f8c8ac19a3")
        )
      ),
      Stage("DEV") -> ContributionsZuoraIds(
        monthly = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92c0f85a6b134e015a7fcd9f0c7855"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85a6b1352015a7fcf35ab397c")
        ),
        annual = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92c0f85e2d19af015e3896e824092c"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85e2d19af015e3896e84d092e")
        )
      )
    )
    mappings.get(stage).toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"missing zuora ids for stage $stage"))
  }

}
