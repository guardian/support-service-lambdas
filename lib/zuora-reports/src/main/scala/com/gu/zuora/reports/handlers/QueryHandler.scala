package com.gu.zuora.reports.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Config
import com.gu.zuora.reports.{Querier, QuerierRequest, QuerierResponse, ReportsLambda}
import com.gu.zuora.reports.ReportsLambda.StepsConfig
import com.gu.zuora.reports.aqua.{AquaQueryRequest, ZuoraAquaRequestMaker}
import play.api.libs.json.Reads

object QueryHandler {

  def apply[REQ <: QuerierRequest](
    reportsBucketPrefix: String,
    toQueryRequest: REQ => AquaQueryRequest,
    queryReads: Reads[REQ]
  )(inputStream: InputStream, outputStream: OutputStream, context: Context) = {

    def wireQuerier(config: Config[StepsConfig]) = {
      Querier(toQueryRequest, ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)) _
    }

    ReportsLambda[REQ, QuerierResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), wireQuerier)(queryReads, QuerierResponse.writes)
  }
}
