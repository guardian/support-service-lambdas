package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import com.gu.sf_datalake_export.salesforce_bulk_api.{GetBatchResult, GetBatchResultId, S3UploadFile}
import com.gu.sf_datalake_export.util.TryOps.{ClientFailableOpsOp, DisjunctionOps}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.JsonHandler
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import scalaz.IList
import scalaz.syntax.traverse.ToTraverseOps
import scala.util.{Success, Try}

object DownloadBatch {
  import com.gu.sf_datalake_export.util.TryOps._

  case class WireBatch(
    batchId: String,
    state: String
  )

  object WireBatch {
    implicit val format = Json.format[WireBatch]

    def toBatch(wire: WireBatch): ClientFailableOp[BatchInfo] =
      BatchState.fromStringState(wire.state).map { state =>
        BatchInfo(batchId = BatchId(wire.batchId), state = state)
      }

    def fromBatch(batch: BatchInfo) = WireBatch(
      batchId = batch.batchId.value,
      state = batch.state.name
    )
  }

  case class WireState(
    jobName: String,
    jobId: String,
    batches: List[WireBatch],
    done: Boolean = false
  )

  object WireState {
    implicit val format = Json.using[Json.WithDefaultValues].format[WireState]
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = wireOperation(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, RawEffects.s3Write)
    )
  }

  def download(
    uploadFile: File => Try[_],
    getBatchResultId: GetBatchResultRequest => ClientFailableOp[BatchResultId],
    getBatchResult: DownloadResultsRequest => ClientFailableOp[FileContent]
  )(
    jobName: JobName,
    jobId: JobId,
    batchId: BatchId
  ): Try[Unit] = {
    val getIdRequest = GetBatchResultRequest(jobId, batchId)
    logger.info(s"downloading $getIdRequest")
    for {
      resultId <- getBatchResultId(getIdRequest).toTry
      downloadRequest = DownloadResultsRequest(jobId, batchId, resultId)
      fileContent <- getBatchResult(downloadRequest).toTry
      fileName = FileName(s"${jobName.value}-${jobId.value}-${resultId.id}.csv")
      file = File(fileName, fileContent)
      _ <- uploadFile(file)
    } yield ()
  }

  def downloadFirst(downloadBatch: (JobName, JobId, BatchId) => Try[Unit])(
    jobId: JobId,
    jobName: JobName,
    pendingBatches: List[BatchInfo]
  ): Try[WireState] = pendingBatches match {

    case Nil => Success(
      WireState(
        jobId = jobId.value,
        jobName = jobName.value,
        batches = Nil,
        done = true
      )
    )

    case pendingJob :: tail => downloadBatch(jobName, jobId, pendingJob.batchId).map { _ =>
      WireState(
        jobId = jobId.value,
        jobName = jobName.value,
        batches = tail.map(WireBatch.fromBatch),
        done = tail.isEmpty
      )
    }
  }

  def steps(
    downloadBatch: (JobName, JobId, BatchId) => Try[Unit]
  )(request: WireState): Try[WireState] = for {
    batches <- IList(request.batches: _*).traverse(WireBatch.toBatch).map(_.toList).toTry
    pendingBatches = batches.filter(b => b.state == Completed)
    jobId = JobId(request.jobId)
    jobName = JobName(request.jobName)
    response <- downloadFirst(downloadBatch)(jobId, jobName, pendingBatches)
  } yield response

  def wireOperation(
    stage: Stage,
    fetchString: StringFromS3,
    getResponse: Request => Response,
    s3Write: PutObjectRequest => Try[PutObjectResult]
  )(request: WireState): Try[WireState] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    for {
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(_.error).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      wiredGetBatchResultId = sfClient.wrapWith(GetBatchResultId.wrapper).runRequest _
      wiredGetBatchResult = sfClient.wrapWith(GetBatchResult.wrapper).runRequest _
      uploadFile = S3UploadFile(stage, s3Write) _
      wiredDownloadBatch = download(uploadFile, wiredGetBatchResultId, wiredGetBatchResult) _
      response <- steps(wiredDownloadBatch)(request)

    } yield response

  }
}
