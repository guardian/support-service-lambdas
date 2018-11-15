package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.AddQueryRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob._
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, BulkApiParams, CreateJob}
import com.gu.sf_datalake_export.util.TryOps._
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.JsonHandler
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.Types.ClientFailableOp
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}

import scala.util.Try

object StartJob {

  case class WireRequest(
    objectName: String
  )

  object WireRequest {
    implicit val reads: Reads[WireRequest] = Json.reads[WireRequest]
  }

  case class WireResponse(
    jobId: String,
    jobName: String
  )

  object WireResponse {
    implicit val writes = Json.writes[WireResponse]
  }

  def steps(
    getCurrentDate: () => LocalDate,
    createJob: CreateJobRequest => ClientFailableOp[JobId],
    addQuery: AddQueryRequest => ClientFailableOp[Unit]
  )(request: WireRequest): Try[WireResponse] = {
    for {
      sfQueryInfo <- BulkApiParams.findByName(request.objectName).toTry(noneErrorMessage = s"invalid object name ${request.objectName}")
      createJobRequest = CreateJobRequest(sfQueryInfo.sfObjectName, sfQueryInfo.batchSize)
      jobId <- createJob(createJobRequest).toTry
      addQueryRequest = AddQueryRequest(sfQueryInfo.soql, jobId)
      _ <- addQuery(addQueryRequest).toTry
      jobName = s"${sfQueryInfo.objectName.value}_${getCurrentDate()}"
    } yield WireResponse(jobId.value, jobName)
  }

  def operation(
    getCurrentDate: () => LocalDate,
    stage: Stage,
    fetchString: StringFromS3,
    getResponse: Request => Response
  )(request: WireRequest): Try[WireResponse] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    for {
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(_.error).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      createJobOp = sfClient.wrapWith(JsonHttp.post).wrapWith(CreateJob.wrapper).runRequest _
      addQueryToJobOp = sfClient.wrapWith(AddQueryToJob.wrapper).runRequest _
      wiredSteps = steps(getCurrentDate, createJobOp, addQueryToJobOp) _
      response <- wiredSteps(request)
    } yield response
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val getCurrentDate = () => RawEffects.now().toLocalDate

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation(getCurrentDate, RawEffects.stage, GetFromS3.fetchString, RawEffects.response)
    )

  }

}

