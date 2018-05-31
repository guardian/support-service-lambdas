package com.gu.zuora.reports

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO

object Handlers {

  def queryHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    ReportsLambda[QuerierRequest](RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), Querier.apply)
  }

}
