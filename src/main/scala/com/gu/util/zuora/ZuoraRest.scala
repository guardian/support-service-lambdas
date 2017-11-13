package com.gu.util.zuora

import java.util.concurrent.TimeUnit

import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.zuora.Types.{ ZuoraOp, ZuoraReader }
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.{ ETConfig, Logging, ZuoraRestConfig }
import okhttp3._
import play.api.libs.functional.syntax._
import play.api.libs.json._

import scala.util.{ Failure, Success, Try }
import scalaz.Scalaz._
import scalaz.{ -\/, EitherT, Reader, \/, \/- }

object SalesforceRequestWiring extends Logging {

  private val authEndpoint = "https://auth.exacttargetapis.com/v1/requestToken"
  val restEndpoint = "https://www.exacttargetapis.com/messaging/v1"

  case class SalesforceAuth(accessToken: String, expiresIn: Int)

  object SalesforceAuth {

    implicit val salesforceAuthReads: Reads[SalesforceAuth] = (
      (JsPath \ "accessToken").read[String] and
      (JsPath \ "expiresIn").read[Int]
    )(SalesforceAuth.apply _)

  }

  val restClient = new OkHttpClient().newBuilder()
    .readTimeout(15, TimeUnit.SECONDS)
    .build()

  def requestBuilder(): Request.Builder = {
    new Request.Builder()
      .url(authEndpoint)
  }

  def withSfAuth(requestBuilder: Request.Builder, salesforceAuth: SalesforceAuth): Request.Builder = {
    requestBuilder.addHeader("Authorization", s"Bearer ${salesforceAuth.accessToken}")
  }

  def authenticate(config: ETConfig): String \/ SalesforceAuth = {
    val builder = requestBuilder()
    val formBody = new FormBody.Builder()
      .add("clientId", config.clientId)
      .add("clientSecret", config.clientSecret)
      .build()
    val request = builder.post(formBody).build()
    logger.info(s"Attempting to perform Salesforce Authentication")
    val response = restClient.newCall(request).execute()
    val responseBody = Json.parse(response.body().string())
    responseBody.validate[SalesforceAuth] match {
      case JsSuccess(result, _) =>
        logger.info(s"Successful Salesforce authentication.")
        \/-(result)
      case _ =>
        -\/(s"Failed to authenticate with Salesforce | body was: ${responseBody.toString}")
    }
  }

}

class ZuoraRestRequestMaker(config: ZuoraRestConfig, etConfig: ETConfig) {
  def buildRequestET(attempt: Int): \/[String, Request.Builder] = {

    //    val endpoint = s"${zhttp.restEndpoint}/messageDefinitionSends/${zhttp.stageETIDForAttempt(message.attempt)}/send"
    //      .header("Authorization", s"Bearer ${task.get().getOrElse("")}")

    val aaa = SalesforceRequestWiring.authenticate(etConfig)
    aaa.map { bbb =>
      new Request.Builder()
        .header("Authorization", s"Bearer ${ /*task.get().getOrElse("")*/ bbb.accessToken}") //TODO
        //      .addHeader("apiSecretAccessKey", config.password)
        //      .addHeader("apiAccessKeyId", config.username)
        .url(s"${SalesforceRequestWiring.restEndpoint}/messageDefinitionSends/${etConfig.stageETIDForAttempt(attempt)}/send")
    }
  }

  val response: Request => Response = {
    val restClient = new OkHttpClient().newBuilder()
      .readTimeout(15, TimeUnit.SECONDS)
      .build()

    { request: Request =>
      restClient.newCall(request).execute
    }
  }

  def buildRequest(route: String): Request.Builder =
    new Request.Builder()
      .addHeader("apiSecretAccessKey", config.password)
      .addHeader("apiAccessKeyId", config.username)
      .url(s"${config.baseUrl}/$route")

}

object ZuoraRestRequestMaker extends Logging {

  def convertResponseToCaseClass[T](response: Response)(implicit r: Reads[T]): ApiResponse \/ T = {
    if (response.isSuccessful) {
      val bodyAsJson = Json.parse(response.body.string)
      bodyAsJson.validate[ZuoraCommonFields] match {
        case JsSuccess(ZuoraCommonFields(true), _) =>
          bodyAsJson.validate[T] match {
            case success: JsSuccess[T] => success.get.right
            case error: JsError => {
              logger.info(s"Failed to convert Zuora response to case case. Response body was: \n ${bodyAsJson}")
              internalServerError("Error when converting Zuora response to case class").left
            }
          }
        case JsSuccess(zuoraFailure, _) =>
          logger.error(s"Zuora rejected our call $bodyAsJson")
          internalServerError("Received failure result from Zuora during autoCancellation").left
        case error: JsError => {
          logger.info(s"Failed to convert Zuora response to case case. Response body was: \n ${bodyAsJson}")
          internalServerError("Error when converting Zuora response to case class").left
        }
      }

    } else {
      logger.error(s"Request to Zuora was unsuccessful, the response was: \n $response")
      internalServerError("Request to Zuora was unsuccessful").left
    }
  }

  def get[RESP](path: String)(implicit r: Reads[RESP]): ZuoraOp[RESP] = EitherT[ZuoraReader, ApiResponse, RESP](Reader { zhttp =>
    val request = zhttp.buildRequest(path).get().build()
    logger.info(s"Getting $path from Zuora")
    val response = zhttp.response(request)
    convertResponseToCaseClass[RESP](response)
  })

  def put[REQ, RESP](req: REQ, path: String)(implicit tjs: Writes[REQ], r: Reads[RESP]): ZuoraOp[RESP] = EitherT[ZuoraReader, ApiResponse, RESP](Reader { zhttp =>
    val body = RequestBody.create(MediaType.parse("application/json"), Json.toJson(req).toString)
    val request = zhttp.buildRequest(path).put(body).build()
    logger.info(s"Attempting to $path with the following command: $req")
    val response = zhttp.response(request)
    convertResponseToCaseClass[RESP](response)
  })

}
