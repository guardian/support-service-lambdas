package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.CloseJob
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.JsonHandler
import com.gu.util.resthttp.JsonHttp
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import com.gu.sf_datalake_export.util.TryOps._
import scala.util.Try

object EndJobHandler {

  case class WireRequest(
    jobId: String
  )

  object WireRequest {
    implicit val reads: Reads[WireRequest] = Json.reads[WireRequest]
  }

  case class WireResponse(jobId: String, state: String = "Closed")

  object WireResponse {
    implicit val writes = Json.writes[WireResponse]
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation(RawEffects.stage, GetFromS3.fetchString, RawEffects.response)
    )
  }

  def operation(
    stage: Stage,
    fetchString: StringFromS3,
    getResponse: Request => Response
  )(request: WireRequest): Try[WireResponse] = {

    val loadConfig = LoadConfigModule(stage, fetchString)
    val jobId = JobId(request.jobId)

    for {
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(_.error).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      wiredCloseJob = sfClient.wrapWith(JsonHttp.post).wrapWith(CloseJob.wrapper)
      _ <- wiredCloseJob.runRequest(jobId).toTry
    } yield WireResponse(
      jobId = request.jobId
    )

  }

}
