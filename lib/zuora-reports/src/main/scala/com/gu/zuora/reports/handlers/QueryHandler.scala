package com.gu.zuora.reports.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.reports.{Querier, QuerierRequest, QuerierResponse, ReportsLambda}
import com.gu.zuora.reports.aqua.{AquaQueryRequest, ZuoraAquaRequestMaker}
import play.api.libs.json.Reads

object QueryHandler {

  def apply[REQ <: QuerierRequest](
      reportsBucketPrefix: String,
      toQueryRequest: REQ => AquaQueryRequest,
      queryReads: Reads[REQ],
  )(inputStream: InputStream, outputStream: OutputStream, context: Context) = {

    def wireQuerier(zuoraRestConfig: ZuoraRestConfig) = {
      Querier(toQueryRequest, ZuoraAquaRequestMaker(RawEffects.response, zuoraRestConfig)) _
    }

    ReportsLambda[REQ, QuerierResponse](
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context),
      wireQuerier,
    )(queryReads, QuerierResponse.writes)
  }
}
