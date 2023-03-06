package com.gu.zuora.reports.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.reports._
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker

object FetchFileHandler {

  def apply(
      reportsBucketPrefix: String,
  )(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    def customWiring(zuoraConfig: ZuoraRestConfig) = {
      val destinationBucket = s"$reportsBucketPrefix-${RawEffects.stage.value.toLowerCase}"
      val upload = S3ReportUpload(destinationBucket, RawEffects.s3Write) _
      val downloadRequestMaker = ZuoraAquaRequestMaker(RawEffects.downloadResponse, zuoraConfig)
      FetchFile(upload, downloadRequestMaker.getDownloadStream) _
    }

    ReportsLambda[FetchFileRequest, FetchFileResponse](
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context),
      customWiring,
    )
  }
}
