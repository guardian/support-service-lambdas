package com.gu.newproduct.api.productcatalog

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.productcatalog.WireModel._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{Stage, ZuoraEnvironment}
import com.gu.util.reader.Types.{ApiGatewayOp, _}

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      runWithEffects(
        RawEffects.stage,
        GetFromS3.fetchString,
        LocalDate.now(),
      )
    }

  def runWithEffects(stage: Stage, fetchString: StringFromS3, today: LocalDate): ApiGatewayOp[Operation] = for {
    zuoraIds <- ZuoraIds.zuoraIdsForStage(stage).toApiGatewayOp(ApiGatewayResponse.internalServerError _).withLogging("zuoraIds")
    zuoraToPlanId = zuoraIds.rateplanIdToApiId.get _
    zuoraEnv = ZuoraEnvironment.EnvForStage(stage).withLogging("zuoraEnv")
    plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraToPlanId).toApiGatewayOp(
      "get prices from zuora catalog",
    ).withLogging("plansWithPrice")
    getPricesForPlan = (planId: PlanId) => plansWithPrice.getOrElse(planId, Map.empty)
    startDateFromProductType <- StartDateFromFulfilmentFiles(stage, fetchString, today).toApiGatewayOpOr422.withLogging("startDateFromProductType")
  } yield Operation.noHealthcheck { req: ApiGatewayRequest =>
    val catalog = NewProductApi.catalog(getPricesForPlan, startDateFromProductType, today).withLogging("catalog")
    val wireCatalog = WireCatalog.fromCatalog(catalog)
    ApiGatewayResponse(body = wireCatalog, statusCode = "200")
  }

  // run this method with membership janus credentials, to check that the lambda is working and log the output to the console
  def main(args: Array[String]): Unit = {
    val result = runWithEffects(
      Stage("CODE"),
      GetFromS3.fetchString,
      LocalDate.now(),
    )
    println(result.map(_.steps(ApiGatewayRequest(None, None, None, None, None, None))))
  }
}
