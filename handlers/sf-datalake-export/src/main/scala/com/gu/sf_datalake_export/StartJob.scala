package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.sf_datalake_export.salesforce_bulk_api.AddQueryToJob.{AddQueryRequest, Query}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob._
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, CreateJob}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{ParseRequest, SerialiseResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.Scalaz._
import scalaz.{-\/, \/, \/-}

object StartJob {

  case class WireRequest(
    jobName: String,
    query: String,
    objectType: String,
    chunkSize: Option[Int]
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

    val loadConfig = LoadConfigModule(stage, fetchString)

    def validateChunkSize(maybeChunkSize: Option[Int]): \/[String, Unit] = maybeChunkSize match {
      case Some(size) if (size < 100000) => -\/("chunk size must be at least 100,000. Sf has a limited amount of batches per day")
      case _ => \/-(())
    }
    //todo add proper error handling
    val lambdaResponse = for {
      request <- ParseRequest[WireRequest](lambdaIO.inputStream).toEither.disjunction.leftMap(failure => failure.getMessage)
      _ <- validateChunkSize(request.chunkSize)
      sfConfig <- loadConfig[SFAuthConfig].leftMap(failure => failure.error)
      //fix auth so that it doesn't return apigatewayop
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toDisjunction.leftMap(failure => failure.message)
      createJobOp = CreateJob(sfClient.wrapWith(JsonHttp.post))
      createJobRequest = CreateJobRequest(request.objectType, request.chunkSize)
      jobId <- createJobOp(createJobRequest).toDisjunction.leftMap(failure => failure.message)
      addQueryToJobOp = AddQueryToJob(sfClient)
      addQueryRequest = AddQueryRequest(
        Query(request.query),
        jobId,
      )
      _ <- addQueryToJobOp(addQueryRequest).toDisjunction.leftMap(failure => failure.message)

    } yield WireResponse(jobId.value, request.jobName)

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

