package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.AddQueryRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.SfQueryInfo
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob._
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, BulkApiParams, CreateJob}
import com.gu.sf_datalake_export.util.TryOps._
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{JsonHandler, LambdaException}
import com.gu.util.resthttp.JsonHttp
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}

import scala.util.{Failure, Success, Try}

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

  def sfQueryInfoFor(objectName:String): Try[SfQueryInfo] = BulkApiParams.all.find(_.objectName.value == objectName) match{
    case Some(sfQueryInfo) => Success(sfQueryInfo)
    case None => Failure(LambdaException(s"invalid object name $objectName"))
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val getCurrentDate = () => RawEffects.now().toLocalDate

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation(getCurrentDate,  RawEffects.stage, GetFromS3.fetchString, RawEffects.response )
    )

    def operation(
      getCurrentDate : () => LocalDate,
      stage: Stage,
      fetchString: StringFromS3,
      getResponse: Request => Response
    )
      (request: WireRequest): Try[WireResponse] = {
      val loadConfig: LoadConfigModule.PartialApply = LoadConfigModule(stage, fetchString)
      for {
        sfQueryInfo <- sfQueryInfoFor(request.objectName)
        sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(_.error).toTry
        sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
        sfPost = sfClient.wrapWith(JsonHttp.post)
        createJobOp = sfClient.wrapWith(JsonHttp.post).wrapWith(CreateJob.wrapper)
        createJobRequest = CreateJobRequest(sfQueryInfo.sfObjectName, sfQueryInfo.batchSize)
        jobId <- createJobOp.runRequest(createJobRequest).toTry
        addQueryToJobOp = sfClient.wrapWith(AddQueryToJob.wrapper)
        addQueryRequest = AddQueryRequest(
          sfQueryInfo.soql,
          jobId,
        )
        _ <- addQueryToJobOp.runRequest(addQueryRequest).toTry
        jobName = s"${sfQueryInfo.objectName.value}_${getCurrentDate()}"

      } yield WireResponse(jobId.value, jobName)
    }
  }

  def validateChunkSize(maybeChunkSize: Option[Int]): Try[Unit] = maybeChunkSize match {
    case Some(size) if (size < 100000) => Failure(LambdaException("chunk size must be at least 100,000. Sf has a limited amount of batches per day"))
    case _ => Success(())
  }

}

