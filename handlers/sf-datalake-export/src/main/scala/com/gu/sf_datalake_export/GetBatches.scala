package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SFExportAuthConfig}
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches._
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{ParseRequest, SerialiseResponse}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import scalaz.Scalaz._
import scalaz.{-\/, \/-}
//TODO IGNORE BATCHES WITH NO ROWS (FOR THE PK CHUNKING CASE)
object GetBatches {

  case class WireRequest(
    jobId: String,
    jobName: String
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
    jobStatus: String,
    batches: Seq[WireBatch]
  )

  object WireResponse {
    implicit val writes = Json.writes[WireResponse]
  }

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val lambdaIO = LambdaIO(inputStream, outputStream, context)
    steps(
      lambdaIO,
      RawEffects.stage,
      GetFromS3.fetchString,
      RawEffects.response
    )
  }

  def steps(
    lambdaIO: LambdaIO,
    stage: Stage,
    fetchString: StringFromS3,
    getResponse: Request => Response
  ): Unit = {

    def getStatus(batches: Seq[BatchInfo]): JobStatus = batches.map(_.state).foldRight(CompletedJob: JobStatus) {
      case (Failed, _) => FailedJob
      case (_, FailedJob) => FailedJob
      case (Queued, _) => PendingJob
      case (InProgress, _) => PendingJob
      case (Completed, currentStatus) => currentStatus
      case (NotProcessed, currentStatus) => currentStatus
    }

    val loadConfig = LoadConfigModule(stage, fetchString)

    //todo add proper error handling
    val lambdaResponse = for {
      request <- ParseRequest[WireRequest](lambdaIO.inputStream).toEither.disjunction.leftMap(failure => failure.getMessage)
      jobId = JobId(request.jobId)
      sfConfig <- loadConfig[SFAuthConfig](SFExportAuthConfig.location, SFAuthConfig.reads).leftMap(failure => failure.error) //fix auth so that it doesn't return apigatewayop
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toDisjunction.leftMap(failure => failure.message)
      getJobBatchesOp = GetJobBatches(sfClient)
      batches <- getJobBatchesOp(jobId).toDisjunction.leftMap(failure => failure.message)
      status = getStatus(batches)
    } yield WireResponse(
      jobId = request.jobId,
      jobName = request.jobName,
      jobStatus = status.name,
      batches = batches.map(WireBatch.fromBatch)
    )

    lambdaResponse match {
      case -\/(error) => {
        logger.error(s"terminating lambda with error $error")
        throw new LambdaException(error)
      }
      case \/-(successResponse) => SerialiseResponse(lambdaIO.outputStream, successResponse)
    }
  }

  class LambdaException(msg: String) extends RuntimeException(msg)

}

