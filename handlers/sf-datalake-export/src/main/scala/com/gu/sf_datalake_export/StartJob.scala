package com.gu.sf_datalake_export

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient.{PostMethod, StringHttpRequest}
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.sf_datalake_export.salesforce_bulk_api.{AddQueryToJob, CreateJob}
import com.gu.sf_datalake_export.salesforce_bulk_api.CreateJob.SfContact
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{ParseRequest, SerialiseResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, PostRequest}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/, \/-}
import scalaz.Scalaz._
import salesforce_bulk_api.CreateJob.SfContact
import AddQueryToJob.{AddQueryRequest, Query}
case class StartJobRequest(something: String)

object StartJobRequest {
  implicit val reads: Reads[StartJobRequest] = Json.reads[StartJobRequest]
}

object StartJob {
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

    //todo add proper error handling
    val lambdaResponse = for {
      request <- ParseRequest[StartJobRequest](lambdaIO.inputStream).toEither.disjunction.leftMap(failure => failure.getMessage)
      sfConfig <- loadConfig[SFAuthConfig].leftMap(failure => failure.error)
      //fix auth so that it doesn't return apigatewayop
      sfClient <- SalesforceClient(getResponse, sfConfig).value.toDisjunction.leftMap(failure => failure.message)
      createJobOp = CreateJob(sfClient.wrap(JsonHttp.post))
      jobId <- createJobOp(SfContact).toDisjunction.leftMap(failure => failure.message)
      addQueryToJobOp = AddQueryToJob(sfClient)
      addQueryRequest = AddQueryRequest(
        Query("SELECT id, Name FROM Contact  where LastName = 'bla'"),
        jobId
      )
      _ <- addQueryToJobOp(addQueryRequest).toDisjunction.leftMap(failure => failure.message)
    } yield jobId

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

