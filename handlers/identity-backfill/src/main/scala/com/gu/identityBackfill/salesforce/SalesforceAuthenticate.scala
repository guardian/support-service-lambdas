package com.gu.identityBackfill.salesforce

import com.gu.util.Logging
import com.gu.util.reader.Types.{FailableOp, _}
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json.{Json, Reads}

object SalesforceAuthenticate extends Logging {

  case class SFAuthConfig(
    url: String,
    client_id: String,
    client_secret: String,
    username: String,
    password: String,
    token: String
  )
  object SFAuthConfig {
    implicit val reads: Reads[SFAuthConfig] = Json.reads[SFAuthConfig]
  }

  // the WireResponse model is the same as the domain model, so keep a friendly name
  case class SalesforceAuth(access_token: String, instance_url: String)
  object SalesforceAuth {
    implicit val salesforceAuthReads: Reads[SalesforceAuth] = Json.reads[SalesforceAuth]
  }

  def apply(
    response: (Request => Response),
    config: SFAuthConfig
  ): FailableOp[SalesforceAuth] = {
    val request: Request = buildAuthRequest(config)
    val body = response(request).body().string()
    Json.parse(body).validate[SalesforceAuth].toFailableOp("Failed to authenticate with Salesforce").withLogging("salesforce auth")
  }

  private def buildAuthRequest(config: SFAuthConfig) = {
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
