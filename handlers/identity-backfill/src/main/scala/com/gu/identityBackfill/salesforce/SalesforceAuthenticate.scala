package com.gu.identityBackfill.salesforce

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json.{JsSuccess, Json, Reads}
import scalaz.{-\/, \/-}

object SalesforceAuthenticate extends Logging {

  case class SFConfig(
    url: String,
    client_id: String,
    client_secret: String,
    username: String,
    password: String,
    token: String
  )
  object SFConfig {
    implicit val reads: Reads[SFConfig] = Json.reads[SFConfig]
  }

  case class SalesforceAuth(access_token: String, instance_url: String)

  object SalesforceAuth {

    implicit val salesforceAuthReads: Reads[SalesforceAuth] = Json.reads[SalesforceAuth]

  }

  def apply(
    response: (Request => Response),
    config: SFConfig
  ): FailableOp[SalesforceAuth] = {
    val request: Request = buildAuthRequest(config)
    logger.info(s"Attempting to perform Salesforce Authentication")
    val responseBody = Json.parse(response(request).body().string())
    responseBody.validate[SalesforceAuth] match {
      case JsSuccess(result, _) =>
        logger.info(s"Successful Salesforce authentication.")
        \/-(result)
      case _ =>
        logger.error(s"Failed to authenticate with Salesforce | body was: ${responseBody.toString}")
        -\/(ApiGatewayResponse.internalServerError(s"Failed to authenticate with Salesforce"))
    }
  }

  private def buildAuthRequest(config: SFConfig) = {
    import config._
    val builder =
      new Request.Builder()
        .url(url + "/services/oauth2/token")
    val formBody = new FormBody.Builder()
      .add("client_id", client_id)
      .add("client_secret", client_secret)
      .add("username", username)
      .add("password", password + token)
      .add("grant_type", "password")
      .build()
    builder.post(formBody).build()
  }
}
