package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import cats.syntax.all._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects._
import com.gu.salesforce.SalesforceReads._
import com.gu.salesforce.{SFAuthConfig, SFExportAuthConfig, SalesforceClient}
import com.gu.sf_datalake_export.handlers.StartJobHandler.ShouldUploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import com.gu.sf_datalake_export.salesforce_bulk_api.{GetBatchResult, GetBatchResultId, S3UploadFile}
import com.gu.sf_datalake_export.util.ExportS3Path
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.JsonHandler
import com.gu.util.resthttp.Types.ClientFailableOp
import com.typesafe.scalalogging.LazyLogging
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.model.{PutObjectRequest, PutObjectResponse}

import scala.util.{Success, Try}

object DownloadBatchHandler extends LazyLogging {

  import com.gu.sf_datalake_export.util.TryOps._
  case class WireBatchInfo(
      batchId: String,
      state: String,
  )
  object WireBatchInfo {
    implicit val format = Json.format[WireBatchInfo]

    def toBatch(wire: WireBatchInfo): ClientFailableOp[BatchInfo] =
      BatchState.fromStringState(wire.state).map { state =>
        BatchInfo(batchId = BatchId(wire.batchId), state = state)
      }

    def fromBatch(batch: BatchInfo) = WireBatchInfo(
      batchId = batch.batchId.value,
      state = batch.state.name,
    )
  }

  case class WireState(
      jobName: String,
      objectName: String,
      jobId: String,
      batches: List[WireBatchInfo],
      uploadToDataLake: Boolean,
      done: Boolean = false,
  )

  object WireState {
    implicit val format = Json.using[Json.WithDefaultValues].format[WireState]

    def toState(wire: WireState): Try[State] = wire.batches.traverse(WireBatchInfo.toBatch).map(_.toList).toTry map {
      batches =>
        State(
          JobId(wire.jobId),
          JobName(wire.jobName),
          ObjectName(wire.objectName),
          batches,
          ShouldUploadToDataLake(wire.uploadToDataLake),
          IsDone(wire.done),
        )
    }

    def fromState(state: State) = WireState(
      jobName = state.jobName.value,
      objectName = state.objectName.value,
      jobId = state.jobId.value,
      batches = state.batches.map(WireBatchInfo.fromBatch),
      uploadToDataLake = state.shouldUploadToDataLake.value,
      done = state.isDone.value,
    )

  }

  case class IsDone(value: Boolean) extends AnyVal
  case class State(
      jobId: JobId,
      jobName: JobName,
      objectName: ObjectName,
      batches: List[BatchInfo],
      shouldUploadToDataLake: ShouldUploadToDataLake,
      isDone: IsDone,
  )

  def wireOperation(
      stage: Stage,
      getFromS3: S3Location => Try[String],
      getResponse: Request => Response,
      s3Write: (PutObjectRequest, RequestBody) => Try[PutObjectResponse],
  )(request: WireState): Try[WireState] = {
    val loadConfig = LoadConfigModule(stage, getFromS3)
    for {
      sfConfig <- loadConfig.load[SFAuthConfig](SFExportAuthConfig.location, sfAuthConfigReads).toTry
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toTry
      wiredGetBatchResultId = sfClient.wrapWith(GetBatchResultId.wrapper).runRequest _
      wiredGetBatchResult = sfClient.wrapWith(GetBatchResult.wrapper).runRequest _
      uploadFile = S3UploadFile(s3Write) _
      wiredBasePathFor = ExportS3Path(stage) _
      wiredDownloadBatch = download(
        uploadFile,
        wiredGetBatchResultId,
        wiredGetBatchResult,
      ) _

      wiredSteps = steps(wiredBasePathFor, wiredDownloadBatch) _
      state <- WireState.toState(request)
      response <- wiredSteps(state)

    } yield WireState.fromState(response)

  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val wiredOperation: WireState => Try[WireState] =
      wireOperation(RawEffects.stage, GetFromS3.fetchString _, RawEffects.response, RawEffects.s3Write)

    JsonHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = wiredOperation,
    )
  }

  def download(
      uploadFile: (S3Path, File) => Try[_],
      getBatchResultId: GetBatchResultRequest => ClientFailableOp[BatchResultId],
      getBatchResult: DownloadResultsRequest => ClientFailableOp[FileContent],
  )(
      jobName: JobName,
      jobId: JobId,
      batchToDownload: BatchId,
      uploadBasePath: S3Path,
  ): Try[Unit] = {
    val getIdRequest = GetBatchResultRequest(jobId, batchToDownload)
    logger.info(s"downloading $getIdRequest")
    for {
      resultId <- getBatchResultId(getIdRequest).toTry
      downloadRequest = DownloadResultsRequest(jobId, batchToDownload, resultId)
      fileContent <- getBatchResult(downloadRequest).toTry
      fileName = FileName(s"${jobName.value}_${jobId.value}_${resultId.id}.csv")
      file = File(fileName, fileContent)
      _ <- uploadFile(uploadBasePath, file)
    } yield ()
  }

  case class ShouldCleanBucket(value: Boolean) extends AnyVal

  def steps(
      getUploadPath: (ObjectName, ShouldUploadToDataLake) => S3Path,
      downloadBatch: (JobName, JobId, BatchId, S3Path) => Try[Unit],
  )(currentState: State): Try[State] = {

    def downloadFirstBatch(uploadBasePath: S3Path) = {
      val downloadableBatches = currentState.batches.filter(_.state == Completed)
      downloadableBatches match {
        case Nil => Success(currentState.copy(isDone = IsDone(true)))

        case pendingBatch :: tail =>
          downloadBatch(currentState.jobName, currentState.jobId, pendingBatch.batchId, uploadBasePath).map { _ =>
            currentState.copy(isDone = IsDone(tail.isEmpty), batches = tail)
          }
      }
    }
    for {
      uploadBasePath <- Success(getUploadPath(currentState.objectName, currentState.shouldUploadToDataLake))
      prefix = S3Path.appendToPrefix(uploadBasePath, currentState.jobName.value)
      newState <- downloadFirstBatch(uploadBasePath)
    } yield newState

  }

}
