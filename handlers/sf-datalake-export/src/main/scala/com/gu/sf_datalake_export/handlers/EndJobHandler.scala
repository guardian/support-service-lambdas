package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, RawEffects, S3Path}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.{CloseJob, S3UploadFile}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.JobName
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import com.gu.sf_datalake_export.util.ExportS3Path
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
    jobName: String,
    uploadToDataLake: Boolean,
    objectName: String,
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
    val uploadFile = S3UploadFile(RawEffects.s3Write) _
    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation(RawEffects.stage, GetFromS3.fetchString, uploadFile, RawEffects.response)
    )
  }

  def operation(
    stage: Stage,
    fetchString: StringFromS3,
    uploadFile: (S3Path, File) => Try[_],
    getResponse: Request => Response
  )(request: WireRequest): Try[WireResponse] = {

    val loadConfig = LoadConfigModule(stage, fetchString)
    val jobId = JobId(request.jobId)
    val shouldUploadToDataLake = ShouldUploadToDataLake(request.uploadToDataLake)
    val jobName = JobName(request.jobName)
    val objectName = ObjectName(request.objectName)

    val uploadPath: S3Path = ExportS3Path(stage)(objectName, shouldUploadToDataLake)

    val successFile = {
      val fileName = FileName(s"_SUCCESS_${jobName.value}")
      File(fileName, FileContent(""))
    }

    for {
      _ <- uploadFile(uploadPath, successFile)
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(_.error).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      wiredCloseJob = sfClient.wrapWith(JsonHttp.post).wrapWith(CloseJob.wrapper)
      _ <- wiredCloseJob.runRequest(jobId).toTry
    } yield WireResponse(
      jobId = request.jobId
    )

  }

}
