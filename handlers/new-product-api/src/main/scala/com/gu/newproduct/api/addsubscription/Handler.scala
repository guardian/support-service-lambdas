package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.config.{LoadConfigModule, Stage, TrustedApiConfig}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.zuora.ZuoraRestConfig
import okhttp3.{Request, Response}
import com.gu.util.reader.Types._

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString, LambdaIO(inputStream, outputStream, context))
  }

  def addSubscriptionSteps(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]()
      _ = logger.info(s"parsed request as $request")
    } yield ApiGatewayResponse(body = AddedSubscription("A-S00045523"), statusCode = "200")).apiResponse
  }

  def runWithEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3, lambdaIO: LambdaIO) = {

    def operation: ZuoraRestConfig => Operation = zuoraRestConfig => {
      Operation.noHealthcheck(
        steps = addSubscriptionSteps,
        shouldAuthenticate = false
      )
    }

    val loadConfig = LoadConfigModule(stage, fetchString)
    ApiGatewayHandler(lambdaIO)(for {
      zuoraConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      trustedApiConfig <- loadConfig[TrustedApiConfig].toApiGatewayOp("load trusted api config")
      configuredOp = operation(zuoraConfig)
    } yield (trustedApiConfig, configuredOp))

  }

  case class ProductRatePlanId(value: String) extends AnyVal
  case class ProductRatePlanChargeId(value: String) extends AnyVal
  case class PlanAndCharge(productRatePlanId: ProductRatePlanId, productRatePlanChargeId: ProductRatePlanChargeId)
  case class ContributionsZuoraIds(monthly: PlanAndCharge, annual: PlanAndCharge)

  def zuoraIdsForStage(stage: Stage): ApiGatewayOp[ContributionsZuoraIds] = {
    val mappings = Map(
      // todo ideally we should add an id to the fields in zuora so we don't have to hard code
      Stage("PROD") -> ContributionsZuoraIds(
        monthly = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92c0f85ab269be015acd9d014549b7"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f85ab2696b015acd9eeb6150ab")
        ),
        annual = PlanAndCharge(
          productRatePlanId = ProductRatePlanId("2c92c0f95e1d5c9c015e38f8c87d19a1"),
          productRatePlanChargeId = ProductRatePlanChargeId("2c92c0f95e1d5c9c015e38f8c8ac19a3")
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
      )
      // probably don't need dev as we'd just pass in the actual object in the test
    )
    mappings.get(stage).toApiGatewayContinueProcessing(ApiGatewayResponse.internalServerError(s"missing zuora ids for stage $stage"))
  }

}
