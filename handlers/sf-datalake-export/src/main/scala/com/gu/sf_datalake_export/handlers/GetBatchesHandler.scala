package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads.sfAuthConfigReads
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.JsonHandler
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import com.gu.sf_datalake_export.util.TryOps._
import scala.util.Try

object GetBatchesHandler {

  case class WireRequest(
      jobId: String,
      jobName: String,
      objectName: String,
      uploadToDataLake: Boolean,
  )

  object WireRequest {
    implicit val reads = Json.reads[WireRequest]
  }

  trait JobStatus {
    def name: String
  }

  object PendingJob extends JobStatus {
    override val name = "Pending"
  }

  object FailedJob extends JobStatus {
    override val name = "Failed"
  }

  object CompletedJob extends JobStatus {
    override val name = "Completed"
  }

  case class WireBatch(batchId: String, state: String)

  object WireBatch {
    implicit val writes = Json.writes[WireBatch]

    def fromBatch(batchInfo: BatchInfo) = WireBatch(batchInfo.batchId.value, batchInfo.state.name)
  }

  case class WireResponse(
      jobId: String,
      jobName: String,
      objectName: String,
      jobStatus: String,
      batches: Seq[WireBatch],
      uploadToDataLake: Boolean,
  )

  object WireResponse {
    implicit val writes = Json.writes[WireResponse]
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = operation(RawEffects.stage, GetFromS3.fetchString, RawEffects.response),
    )
  }

  def getJobStatus(batches: Seq[BatchInfo]): JobStatus = {

    def fromStatusList(remainingBatchStates: Seq[BatchState], jobStatusSoFar: JobStatus): JobStatus =
      remainingBatchStates match {
        case Nil => jobStatusSoFar
        case Failed :: _ => FailedJob
        case Queued :: tail => fromStatusList(tail, PendingJob)
        case InProgress :: tail => fromStatusList(tail, PendingJob)
        case Completed :: tail => fromStatusList(tail, jobStatusSoFar)
        case NotProcessed :: tail => fromStatusList(tail, jobStatusSoFar)
      }

    fromStatusList(batches.map(_.state), CompletedJob)
  }

  def operation(
      stage: Stage,
      fetchString: StringFromS3,
      getResponse: Request => Response,
  )(request: WireRequest): Try[WireResponse] = {

    val loadConfig = LoadConfigModule(stage, fetchString)
    val jobId = JobId(request.jobId)

    for {
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, sfAuthConfigReads).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      getJobBatchesOp = sfClient.wrapWith(GetJobBatches.wrapper)
      batches <- getJobBatchesOp.runRequest(jobId).toTry
      status = getJobStatus(batches)
    } yield WireResponse(
      jobId = request.jobId,
      jobName = request.jobName,
      objectName = request.objectName,
      jobStatus = status.name,
      uploadToDataLake = request.uploadToDataLake,
      batches = batches.map(WireBatch.fromBatch),
    )
  }
}
