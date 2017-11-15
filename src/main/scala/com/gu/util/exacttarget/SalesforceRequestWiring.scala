package com.gu.util.exacttarget

import com.gu.effects.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.zuora.Types.{ FailableOp, ZuoraOp }
import okhttp3.{ FormBody, Request }
import play.api.libs.functional.syntax._
import play.api.libs.json.{ JsPath, JsSuccess, Json, Reads }

import scalaz.{ -\/, Reader, \/, \/- }

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

  //  val restClient = new OkHttpClient().newBuilder()
  //    .readTimeout(15, TimeUnit.SECONDS)
  //    .build()

  def requestBuilder(): Request.Builder = {
    new Request.Builder()
      .url(authEndpoint)
  }

  def withSfAuth(requestBuilder: Request.Builder, salesforceAuth: SalesforceAuth): Request.Builder = {
    requestBuilder.addHeader("Authorization", s"Bearer ${salesforceAuth.accessToken}")
  }

  def authenticate: ZuoraOp[SalesforceAuth] = ZuoraOp(Reader { zhttp =>
    val builder = requestBuilder()
    val formBody = new FormBody.Builder()
      .add("clientId", zhttp.config.etConfig.clientId)
      .add("clientSecret", zhttp.config.etConfig.clientSecret)
      .build()
    val request = builder.post(formBody).build()
    logger.info(s"Attempting to perform Salesforce Authentication")
    val response = zhttp.response(request)
    val responseBody = Json.parse(response.body().string())
    responseBody.validate[SalesforceAuth] match {
      case JsSuccess(result, _) =>
        logger.info(s"Successful Salesforce authentication.")
        \/-(result)
      case _ =>
        logger.error(s"Failed to authenticate with Salesforce | body was: ${responseBody.toString}")
        -\/(ApiGatewayResponse.internalServerError(s"Failed to authenticate with Salesforce"))
    }
  })

  def buildRequestET(attempt: Int): ZuoraOp[Request.Builder] = {

    //    val endpoint = s"${zhttp.restEndpoint}/messageDefinitionSends/${zhttp.stageETIDForAttempt(message.attempt)}/send"
    //      .header("Authorization", s"Bearer ${task.get().getOrElse("")}")

    for {
      bbb <- authenticate
      ccc <- ZuoraOp(Reader { zhttp =>
        val builder = new Request.Builder()
          .header("Authorization", s"Bearer ${ /*task.get().getOrElse("")*/ bbb.accessToken}") //TODO
          //      .addHeader("apiSecretAccessKey", config.password)
          //      .addHeader("apiAccessKeyId", config.username)
          .url(s"${SalesforceRequestWiring.restEndpoint}/messageDefinitionSends/${zhttp.config.etConfig.stageETIDForAttempt(attempt)}/send")
        \/.right(builder): FailableOp[Request.Builder]
      })
    } yield ccc
  }

}
