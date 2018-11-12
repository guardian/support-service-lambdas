package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_datalake_export.util.TryOps._
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.{AddQueryRequest, Query}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob._
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, CreateJob}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{JsonHandler, LambdaException}
import com.gu.util.resthttp.JsonHttp
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}


import scala.util.{Failure, Success, Try}

object StartJob {

  case class WireRequest(
    jobName: String,
    query: String,
    objectType: String,
    chunkSize: Option[Int]
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
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation( RawEffects.stage, GetFromS3.fetchString, RawEffects.response )
    )

    def operation(
      stage: Stage,
      fetchString: StringFromS3,
      getResponse: Request => Response
    )
      (request: WireRequest): Try[WireResponse] = {
      val loadConfig: LoadConfigModule.PartialApply = LoadConfigModule(stage, fetchString)
      for {
        _ <- validateChunkSize(request.chunkSize)
        sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(_.error).toTry
        sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
        createJobOp = sfClient.wrapWith(JsonHttp.post).wrapWith(CreateJob.wrapper)
        createJobRequest = CreateJobRequest(request.objectType, request.chunkSize)
        jobId <- createJobOp.runRequest(createJobRequest).toTry
        addQueryToJobOp = AddQueryToJob(sfClient)
        addQueryRequest = AddQueryRequest(
          Query(request.query),
          jobId,
        )
        _ <- addQueryToJobOp(addQueryRequest).toTry

      } yield WireResponse(jobId.value, request.jobName)
    }
  }

  def validateChunkSize(maybeChunkSize: Option[Int]): Try[Unit] = maybeChunkSize match {
    case Some(size) if (size < 100000) => Failure(LambdaException("chunk size must be at least 100,000. Sf has a limited amount of batches per day"))
    case _ => Success(())
  }

}

