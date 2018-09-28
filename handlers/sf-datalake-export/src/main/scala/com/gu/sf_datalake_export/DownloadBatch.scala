package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.s3.model.{PutObjectRequest, PutObjectResult}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.JobId
import com.gu.sf_datalake_export.salesforce_bulk_api.DownloadResult.DownloadResultsRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.GetBatchResultId.GetBatchResultRequest
import com.gu.sf_datalake_export.salesforce_bulk_api.{DownloadResult, GetBatchResultId, GetJobBatches, S3UploadFile}
import com.gu.sf_datalake_export.salesforce_bulk_api.GetJobBatches.BatchId
import com.gu.sf_datalake_export.salesforce_bulk_api.S3UploadFile.{File, FileName}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{ParseRequest, SerialiseResponse}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import scalaz.Scalaz._
import scalaz.{-\/, \/-}

import scala.util.Try

object DownloadBatch {

  //TODO GET RID OF THIS!
  case class temp(msg: String = "success!")
  implicit val writes = Json.writes[temp]

  case class WireRequest(
    jobName: String,
    jobId: String,
    batchId: String
  )

  object WireRequest {
    implicit val reads = Json.reads[WireRequest]
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

    val loadConfig = LoadConfigModule(stage, fetchString)

    //todo add proper error handling
    val lambdaResponse = for {
      request <- ParseRequest[WireRequest](lambdaIO.inputStream).toEither.disjunction.leftMap(failure => failure.getMessage)
      batchId = BatchId(request.batchId)
      jobId = JobId(request.jobId)
      sfConfig <- loadConfig[SFAuthConfig].leftMap(failure => failure.error)
      //fix auth so that it doesn't return apigatewayop
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toDisjunction.leftMap(failure => failure.message)
      getBatchResultIdOp = GetBatchResultId(sfClient)
      getIdRequest = GetBatchResultRequest(jobId, batchId)
      resultId <- getBatchResultIdOp(getIdRequest).toDisjunction.leftMap(failure => failure.message)
      downloadresultOp = DownloadResult(sfClient)
      downloadRequest = DownloadResultsRequest(jobId, batchId, resultId)
      fileContent <- downloadresultOp(downloadRequest).toDisjunction.leftMap(failure => failure.message)
      fileName = FileName(s"${request.jobName}-${request.jobId}-${resultId.id}.csv")
      file = File(fileName, fileContent)
      uploadtoS3Op <- S3UploadFile(stage, s3Write, file)
    } yield ()

    lambdaResponse match {
      case -\/(error) => {
        logger.error(s"terminating lambda with error $error")
        throw new LambdaException(error)
      }
      case \/-(successResponse) => SerialiseResponse(lambdaIO.outputStream, temp())
    }
  }

  class LambdaException(msg: String) extends RuntimeException(msg)

}

