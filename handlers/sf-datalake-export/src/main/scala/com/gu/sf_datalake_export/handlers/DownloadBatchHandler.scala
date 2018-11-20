package com.gu.sf_datalake_export.handlers

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.handlers.StartJobHandler.UploadToDataLake
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.ObjectName
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{BasePath, File, FileContent, FileName}
import com.gu.sf_datalake_export.salesforce_bulk_api.{GetBatchResult, GetBatchResultId, S3UploadFile}
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

object DownloadBatchHandler {

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
    objectName: String,
    jobId: String,
    batches: List[WireBatch],
    uploadToDataLake: Boolean,
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
    uploadToDataLake: UploadToDataLake,
    basePathFor: (ObjectName, UploadToDataLake) => BasePath,
    uploadFile: (BasePath, File) => Try[_],
    getBatchResultId: GetBatchResultRequest => ClientFailableOp[BatchResultId],
    getBatchResult: DownloadResultsRequest => ClientFailableOp[FileContent]
  )(
    jobName: JobName,
    objectName: ObjectName,
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
      basePath = basePathFor(objectName, uploadToDataLake)
      _ <- uploadFile(basePath, file)
    } yield ()
  }

  def uploadBasePath(stage: Stage)(objectName: ObjectName, uploadToDataLake: UploadToDataLake) = stage match {
    case Stage("PROD") if uploadToDataLake.value => {
      //todo actually upload to the bucket when we are ready
      val bucketName = s"opan-raw-salesforce-${objectName.value.toLowerCase}"
      BasePath(s"gu-salesforce-export-test/PROD/raw/Datalake/$bucketName")
    }
    case Stage(stageName) => BasePath(s"gu-salesforce-export-test/$stageName/raw")
  }

  def downloadFirst(
    downloadBatch: (JobName, ObjectName, JobId, BatchId) => Try[Unit]
  )(
    jobId: JobId,
    jobName: JobName,
    objectName: ObjectName,
    uploadToDataLake: UploadToDataLake,
    pendingBatches: List[BatchInfo]
  ): Try[WireState] = pendingBatches match {

    case Nil => Success(
      WireState(
        jobId = jobId.value,
        jobName = jobName.value,
        objectName = objectName.value,
        batches = Nil,
        done = true,
        uploadToDataLake = uploadToDataLake.value
      )
    )

    case pendingJob :: tail => downloadBatch(jobName, objectName, jobId, pendingJob.batchId).map { _ =>
      WireState(
        jobId = jobId.value,
        jobName = jobName.value,
        objectName = objectName.value,
        batches = tail.map(WireBatch.fromBatch),
        done = tail.isEmpty,
        uploadToDataLake = uploadToDataLake.value
      )
    }
  }

  def steps(
    downloadBatch: (JobName, ObjectName, JobId, BatchId) => Try[Unit]
  )(request: WireState): Try[WireState] = for {
    batches <- IList(request.batches: _*).traverse(WireBatch.toBatch).map(_.toList).toTry
    pendingBatches = batches.filter(b => b.state == Completed)
    jobId = JobId(request.jobId)
    jobName = JobName(request.jobName)
    objectName = ObjectName(request.objectName)
    uploadToDataLake = UploadToDataLake(request.uploadToDataLake)
    response <- downloadFirst(downloadBatch)(jobId, jobName, objectName, uploadToDataLake, pendingBatches)
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
      uploadToDataLake <- UploadToDataLake(Some(request.uploadToDataLake), stage)
      wiredGetBatchResultId = sfClient.wrapWith(GetBatchResultId.wrapper).runRequest _
      wiredGetBatchResult = sfClient.wrapWith(GetBatchResult.wrapper).runRequest _
      uploadFile = S3UploadFile(s3Write) _
      wiredBasePathFor = uploadBasePath(stage) _

      wiredDownloadBatch = download(
        uploadToDataLake,
        wiredBasePathFor,
        uploadFile,
        wiredGetBatchResultId,
        wiredGetBatchResult
      ) _

      response <- steps(wiredDownloadBatch)(request)

    } yield response

  }
}
