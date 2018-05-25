package com.gu.zuora.report

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.zuora.report.aqua.{Querier, QuerierRequest}
import com.gu.zuora.retention.AquaLambda

object Handlers {

  def queryHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    AquaLambda[QuerierRequest](RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), Querier.apply)
  }

}
