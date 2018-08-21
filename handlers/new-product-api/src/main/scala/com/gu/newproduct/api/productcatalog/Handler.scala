package com.gu.newproduct.api.productcatalog

import java.io.{InputStream, OutputStream}

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
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      runWithEffects(LambdaIO(inputStream, outputStream, context), RawEffects.stage, GetFromS3.fetchString)
    }
  }

  def runWithEffects(lambdaIO: LambdaIO, stage: Stage, fetchString: StringFromS3): ApiGatewayOp[Operation] = for {
    zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
    zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
    zuoraEnv = ZuoraEnvironment.EnvForStage(stage)
    plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraToPlanId).toApiGatewayOp("get prices from zuora catalog")
    wireCatalog = WireCatalog.fromCatalog(NewProductApi.catalog, plansWithPrice.get)
  } yield {
    Operation.noHealthcheck {
      Req: ApiGatewayRequest => ApiGatewayResponse(body = wireCatalog, statusCode = "200")
    }
  }

}

