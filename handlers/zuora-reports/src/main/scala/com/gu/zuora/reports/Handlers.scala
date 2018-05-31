package com.gu.zuora.reports

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO

object Handlers {

  def queryHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    ReportsLambda[QuerierRequest, QuerierResponse](RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), Querier.apply)
  }
  def fetchResultsHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    ReportsLambda[JobResultRequest, JobResultResponse](RawEffects.response, RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), GetJobResult.apply)
  }

}
