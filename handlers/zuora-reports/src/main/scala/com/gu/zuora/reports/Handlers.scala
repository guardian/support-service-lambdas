package com.gu.zuora.reports

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Config
import com.gu.zuora.reports.ReportsLambda.StepsConfig
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker

object Handlers {

  def requestMaker(config: Config[StepsConfig]) = ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)

  def queryHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {

    def wireCall(config: Config[StepsConfig]) = Querier(requestMaker(config)) _

    ReportsLambda[QuerierRequest, QuerierResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), wireCall)
  }
  def fetchResultsHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    def wireCall(config: Config[StepsConfig]) = GetJobResult(requestMaker(config)) _

    ReportsLambda[JobResultRequest, JobResult](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), wireCall)
  }

  def fetchFileHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    def wireCall(config: Config[StepsConfig]) = {
      val uploader = S3ReportUploader(config.stage, RawEffects.s3Write) _
      val downloadRequestMaker = ZuoraAquaRequestMaker(RawEffects.downloadResponse, config.stepsConfig.zuoraRestConfig)
      FetchFile(uploader, downloadRequestMaker) _
    }

    ReportsLambda[FetchFileRequest, FetchFileResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), wireCall)
  }

}
