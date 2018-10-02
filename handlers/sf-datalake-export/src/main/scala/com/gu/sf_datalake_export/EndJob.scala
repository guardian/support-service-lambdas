package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, CloseJob, CreateJob}
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{ParseRequest, SerialiseResponse}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}
import play.api.libs.json._
import scalaz.{-\/, \/, \/-}
import scalaz.Scalaz._
import salesforce_bulk_api.CreateJob.SfContact
import AddQueryToJob.{AddQueryRequest, Query}

object EndJob {

  case class WireRequest(
    jobId: String
  )

  object WireRequest {
    implicit val reads: Reads[WireRequest] = Json.reads[WireRequest]
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

  case class WireResponse(jobId: String, state: String = "Closed")

  object WireResponse {
    implicit val writes = Json.writes[WireResponse]
  }

  def steps(
    lambdaIO: LambdaIO,
    stage: Stage,
    fetchString: StringFromS3,
    getResponse: Request => Response
  ): Unit = {

    val loadConfig = LoadConfigModule(stage, fetchString)

    //todo add proper error handling
    val lambdaResponse = for {
      request <- ParseRequest[WireRequest](lambdaIO.inputStream).toEither.disjunction.leftMap(failure => failure.getMessage)
      jobId = JobId(request.jobId)
      sfConfig <- loadConfig[SFAuthConfig].leftMap(failure => failure.error)
      //fix auth so that it doesn't return apigatewayop
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toDisjunction.leftMap(failure => failure.message)
      wiredCloseJob = CloseJob(sfClient.wrap(JsonHttp.post))
      _ <- wiredCloseJob(jobId).toDisjunction.leftMap(failure => failure.message)
    } yield WireResponse(
      jobId = request.jobId
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

