package com.gu.util.exacttarget

import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.{ ETConfig, Logging }
import okhttp3.{ FormBody, Request, Response }
import play.api.libs.functional.syntax._
import play.api.libs.json.{ JsPath, JsSuccess, Json, Reads }

import scalaz.{ -\/, \/- }

object SalesforceAuthenticate extends Logging {

  private val authEndpoint = "https://auth.exacttargetapis.com/v1/requestToken"
  val restEndpoint = "https://www.exacttargetapis.com/messaging/v1"

  case class SalesforceAuth(accessToken: String, expiresIn: Int)

  object SalesforceAuth {

    implicit val salesforceAuthReads: Reads[SalesforceAuth] = (
      (JsPath \ "accessToken").read[String] and
      (JsPath \ "expiresIn").read[Int]
    )(SalesforceAuth.apply _)

  }

  def requestBuilder(): Request.Builder = {
    new Request.Builder()
      .url(authEndpoint)
  }

  case class ETImpure(response: (Request => Response), config: ETConfig)

  def apply(et: ETImpure): FailableOp[SalesforceAuth] = {
    val builder = requestBuilder()
    val formBody = new FormBody.Builder()
      .add("clientId", et.config.clientId)
      .add("clientSecret", et.config.clientSecret)
      .build()
    val request = builder.post(formBody).build()
    logger.info(s"Attempting to perform Salesforce Authentication")
    val response = et.response(request)
    val responseBody = Json.parse(response.body().string())
    responseBody.validate[SalesforceAuth] match {
      case JsSuccess(result, _) =>
        logger.info(s"Successful Salesforce authentication.")
        \/-(result)
      case _ =>
        logger.error(s"Failed to authenticate with Salesforce | body was: ${responseBody.toString}")
        -\/(ApiGatewayResponse.internalServerError(s"Failed to authenticate with Salesforce"))
    }
  }
}
