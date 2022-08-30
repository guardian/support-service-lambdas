package com.gu.newproduct.api.productcatalog

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.productcatalog.WireModel._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{Stage, ZuoraEnvironment}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.newproduct.api.addsubscription.TypeConvert._

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      runWithEffects(
        LambdaIO(inputStream, outputStream, context),
        RawEffects.stage,
        GetFromS3.fetchString,
        LocalDate.now()
      )
    }

  def runWithEffects(lambdaIO: LambdaIO, stage: Stage, fetchString: StringFromS3, today: LocalDate): ApiGatewayOp[Operation] = for {
    zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
    zuoraToPlanId = zuoraIds.rateplanIdToApiId.get _
    zuoraEnv = ZuoraEnvironment.EnvForStage(stage)
    plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraToPlanId).toApiGatewayOp("get prices from zuora catalog")
    getPricesForPlan = (planId: PlanId) => plansWithPrice.getOrElse(planId, Map.empty)
    startDateFromProductType <- StartDateFromFulfilmentFiles(stage, fetchString, today).toApiGatewayOp
    catalog = NewProductApi.catalog(getPricesForPlan, startDateFromProductType, today)
    wireCatalog = WireCatalog.fromCatalog(catalog)
  } yield Operation.noHealthcheck {
    Req: ApiGatewayRequest => ApiGatewayResponse(body = wireCatalog, statusCode = "200")
  }

  def main(args: Array[String]): Unit = {
    val result = runWithEffects(
      null,
      Stage("DEV"),
      GetFromS3.fetchString,
      LocalDate.now()
    )

    println("result:" + result);
  }
}

