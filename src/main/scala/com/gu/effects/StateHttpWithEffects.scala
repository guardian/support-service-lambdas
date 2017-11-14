package com.gu.effects

import java.util.concurrent.TimeUnit

import com.gu.util.zuora.Types.StateHttp
import com.gu.util.{ Config, ETConfig, ZuoraRestConfig }
import okhttp3.{ FormBody, OkHttpClient, Request, Response }
import play.api.libs.functional.syntax._
import play.api.libs.json.{ JsPath, JsSuccess, Json, Reads }

import scalaz.{ -\/, \/, \/- }

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

object StateHttpWithEffects {

  def apply(config: Config): StateHttp = {
    new StateHttp(buildRequestET(config.etConfig), response, buildRequest(config.zuoraRestConfig), isProd, config)
  }

  def buildRequestET(etConfig: ETConfig)(attempt: Int): \/[String, Request.Builder] = {

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

  def buildRequest(config: ZuoraRestConfig)(route: String): Request.Builder =
    new Request.Builder()
      .addHeader("apiSecretAccessKey", config.password)
      .addHeader("apiAccessKeyId", config.username)
      .url(s"${config.baseUrl}/$route")

  def isProd: Boolean = System.getenv("Stage") == "PROD" // should come from the config

}