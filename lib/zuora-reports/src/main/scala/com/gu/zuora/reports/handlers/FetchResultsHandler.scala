package com.gu.zuora.reports.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.reports.ReportsLambda.AquaCall
import com.gu.zuora.reports.aqua.{AquaJobResponse, ZuoraAquaRequestMaker}
import com.gu.zuora.reports.{GetJobResult, JobResult, JobResultRequest, ReportsLambda}

object FetchResultsHandler {

  private def wireCall(zuoraRestConfig: ZuoraRestConfig): AquaCall[JobResultRequest, JobResult] = {
    val zuoraRequests = ZuoraAquaRequestMaker(RawEffects.response, zuoraRestConfig)
    GetJobResult(zuoraRequests.get[AquaJobResponse])
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ReportsLambda[JobResultRequest, JobResult](
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context),
      wireCall,
    )
  }
}
