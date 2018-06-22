package com.gu.zuora.reports.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.Config
import com.gu.zuora.reports.ReportsLambda.StepsConfig
import com.gu.zuora.reports._
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker

object FetchFileHandler {

  def apply(reportsBucketPrefix: String)(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    def customWiring(config: Config[StepsConfig]) = {
      val destinationBucket = s"$reportsBucketPrefix-${config.stage.value.toLowerCase}"
      val upload = S3ReportUpload(destinationBucket, RawEffects.s3Write) _
      val downloadRequestMaker = ZuoraAquaRequestMaker(RawEffects.downloadResponse, config.stepsConfig.zuoraRestConfig)
      FetchFile(upload, downloadRequestMaker.getDownloadStream) _
    }

    ReportsLambda[FetchFileRequest, FetchFileResponse](RawEffects.stage, RawEffects.s3Load, LambdaIO(inputStream, outputStream, context), customWiring)
  }
}
