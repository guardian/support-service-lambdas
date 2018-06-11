package com.gu.zuora.reports

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Config
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.zuora.reports.ReportsLambda.{AquaCall, StepsConfig}
import com.gu.zuora.reports.aqua.{AquaQueryRequest, ZuoraAquaRequestMaker}
import play.api.libs.json.Reads

trait ReportHandlers[QUERY_REQUEST] {

  def reportsBucketPrefix: String
  def reportsBasePath: String
  def toQueryRequest: QUERY_REQUEST => AquaQueryRequest
  implicit def queryReads: Reads[QUERY_REQUEST]
  private def defaultWiring[REQ, RES](call: Requests => AquaCall[REQ, RES])(config: Config[StepsConfig]) = call(ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig))

  def queryHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    def wireQuerier(config: Config[StepsConfig]) = {
      Querier(toQueryRequest, ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)) _
    }
    ReportsLambda[QUERY_REQUEST, QuerierResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), wireQuerier)
  }
  def fetchResultsHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) =
    ReportsLambda[JobResultRequest, JobResult](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), defaultWiring(GetJobResult.apply))

  def fetchFileHandler(inputStream: InputStream, outputStream: OutputStream, context: Context) = {
    def customWiring(config: Config[StepsConfig]) = {
      val destinationBucket = s"$reportsBucketPrefix-${config.stage.value.toLowerCase}"
      val upload = S3ReportUpload(destinationBucket, reportsBasePath, RawEffects.s3Write) _
      val downloadRequestMaker = ZuoraAquaRequestMaker(RawEffects.downloadResponse, config.stepsConfig.zuoraRestConfig)
      FetchFile(upload, downloadRequestMaker) _
    }

    ReportsLambda[FetchFileRequest, FetchFileResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), customWiring)
  }

}
