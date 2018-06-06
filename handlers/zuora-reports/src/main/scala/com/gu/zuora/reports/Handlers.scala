package com.gu.zuora.reports

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Config
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.zuora.reports.ReportsLambda.{AquaCall, StepsConfig}
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker

object Handlers {

  private def defaultWiring[REQ, RES](call: Requests => AquaCall[REQ, RES])(config: Config[StepsConfig]) = call(ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig))

  def queryHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) =
    ReportsLambda[QuerierRequest, QuerierResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), defaultWiring(Querier.apply))

  def fetchResultsHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) =
    ReportsLambda[JobResultRequest, JobResult](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), defaultWiring(GetJobResult.apply))

  def fetchFileHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    def customWiring(config: Config[StepsConfig]) = {
      val uploader = S3ReportUploader(config.stage, RawEffects.s3Write) _
      val downloadRequestMaker = ZuoraAquaRequestMaker(RawEffects.downloadResponse, config.stepsConfig.zuoraRestConfig)
      FetchFile(uploader, downloadRequestMaker) _
    }

    ReportsLambda[FetchFileRequest, FetchFileResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), customWiring)
  }

}
