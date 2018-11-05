package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResult.{DownloadResultsRequest, JobName}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.{BatchResultId, GetBatchResultRequest}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileContent, FileName}
import com.gu.sf_datalake_export.salesforce_bulk_api.{GetBatchResult, GetBatchResultId, S3UploadFile}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{ParseRequest, SerialiseResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import scalaz.Scalaz._
import scalaz.syntax.traverse.ToTraverseOps
import scalaz.{-\/, IList, \/-}

import scala.util.Try
object DownloadBatches {

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

  case class WireIO(
    jobName: String,
    jobId: String,
    batches: List[WireBatch],
    done: Boolean = false
  )

  object WireIO {
    implicit val format = Json.using[Json.WithDefaultValues].format[WireIO]
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val lambdaIO = LambdaIO(inputStream, outputStream, context)
    steps(
      lambdaIO,
      RawEffects.stage,
      GetFromS3.fetchString,
      RawEffects.response,
      RawEffects.s3Write
    )
  }

  def steps(
    lambdaIO: LambdaIO,
    stage: Stage,
    fetchString: StringFromS3,
    getResponse: Request => Response,
    s3Write: PutObjectRequest => Try[PutObjectResult]
  ): Unit = {

    def downloadFirst(
      downloadBatch: BatchId => ClientFailableOp[Unit],
      jobId: JobId,
      jobName: JobName
    )(
      pendingBatches: List[BatchInfo]
    ): ClientFailableOp[WireIO] = pendingBatches match {

      case Nil => ClientSuccess(
        WireIO(
          jobId = jobId.value,
          jobName = jobName.value,
          batches = Nil,
          done = true
        )
      )

      case pendingJob :: tail => downloadBatch(pendingJob.batchId).map { _ =>
        WireIO(
          jobId = jobId.value,
          jobName = jobName.value,
          batches = tail.map(WireBatch.fromBatch),
          done = tail.isEmpty
        )
      }
    }

    def downloadBatch(
      getBatchResultId: GetBatchResultRequest => ClientFailableOp[BatchResultId],
      getBatchResult: DownloadResultsRequest => ClientFailableOp[FileContent],
      jobName: JobName,
      jobId: JobId
    )(batchId: BatchId): ClientFailableOp[Unit] = {
      val getIdRequest = GetBatchResultRequest(jobId, batchId)
      println(s"downloading $getIdRequest")
      for {
        resultId <- getBatchResultId(getIdRequest)
        downloadRequest = DownloadResultsRequest(jobId, batchId, resultId)
        fileContent <- getBatchResult(downloadRequest)
        fileName = FileName(s"${jobName.value}-${jobId.value}-${resultId.id}.csv")
        file = File(fileName, fileContent)
        //todo see how to conver this properly
        uploadtoS3Op <- S3UploadFile(stage, s3Write, file) match {
          case -\/(error) => GenericError(error)
          case \/-(success) => ClientSuccess(success)
        }
      } yield ()
    }

    val loadConfig = LoadConfigModule(stage, fetchString)

    //todo add proper error handling, for now just download the first one and return...
    val lambdaResponse = for {
      request <- ParseRequest[WireIO](lambdaIO.inputStream).toEither.disjunction.leftMap(failure => failure.getMessage)
      batches <- IList(request.batches: _*).traverse(WireBatch.toBatch).map(_.toList).toDisjunction.leftMap(failure => failure.message)
      pendingBatches = batches.filter(b => b.state == Completed)
      sfConfig <- loadConfig[SFAuthConfig].leftMap(failure => failure.error)
      //fix auth so that it doesn't return apigatewayop
      //todo fix so that getting the sf token doesn't happen until we decided that we actually have stuff to do
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toDisjunction.leftMap(failure => failure.message)
      wiredGetBatchResultId = GetBatchResultId(sfClient)
      wiredGetBatchResult = GetBatchResult(sfClient)
      jobId = JobId(request.jobId)
      jobName = JobName(request.jobName)
      wiredDownloadBatch = downloadBatch(wiredGetBatchResultId, wiredGetBatchResult, jobName, jobId) _
      response <- downloadFirst(wiredDownloadBatch, jobId, jobName)(pendingBatches).toDisjunction.leftMap(failure => failure.message)
    } yield response
    lambdaResponse match {
      case -\/(error) => {
        logger.error(s"terminating lambda with error $error")
        throw new LambdaException(error)
      }
      case \/-(successResponse) => SerialiseResponse(lambdaIO.outputStream, successResponse)
    }
  }

  class LambdaException(msg: String) extends RuntimeException(msg) // todo this is repeated all over the place

}

