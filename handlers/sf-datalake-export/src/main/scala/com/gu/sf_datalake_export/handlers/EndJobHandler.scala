package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects, S3Path}
import com.gu.salesforce.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
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
      jobId: String,
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
    val uploadSuccessFile = uploadDummySuccessFileToTriggerOphanJob(RawEffects.stage, uploadFile) _

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation(RawEffects.stage, GetFromS3.fetchString, uploadSuccessFile, RawEffects.response),
    )
  }

  /** Upload a dummy success file to indicate all raw files are uploaded and ready to be processed. The ETL job will be
    * triggered once this file is seen in S3
    */
  def uploadDummySuccessFileToTriggerOphanJob(stage: Stage, uploadFile: (S3Path, File) => Try[_])(
      request: WireRequest,
  ): Try[_] = {

    val shouldUploadToDataLake = ShouldUploadToDataLake(request.uploadToDataLake)
    val jobName = JobName(request.jobName)
    val objectName = ObjectName(request.objectName)
    val uploadPath: S3Path = ExportS3Path(stage)(objectName, shouldUploadToDataLake)

    val successFile = {
      val fileName = FileName(s"_SUCCESS_${jobName.value}")
      File(fileName, FileContent(""))
    }
    uploadFile(uploadPath, successFile)
  }
  def operation(
      stage: Stage,
      fetchString: StringFromS3,
      uploadDummySuccessFileToTriggerOphanJob: WireRequest => Try[_],
      getResponse: Request => Response,
  )(request: WireRequest): Try[WireResponse] = {

    val loadConfig = LoadConfigModule(stage, fetchString)
    val jobId = JobId(request.jobId)

    for {
      _ <- uploadDummySuccessFileToTriggerOphanJob(request)
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, sfAuthConfigReads).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      wiredCloseJob = sfClient.wrapWith(JsonHttp.post).wrapWith(CloseJob.wrapper)
      _ <- wiredCloseJob.runRequest(jobId).toTry
    } yield WireResponse(
      jobId = request.jobId,
    )

  }

}
