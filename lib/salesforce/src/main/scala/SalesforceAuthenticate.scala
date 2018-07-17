package com.gu.salesforce.auth

import com.gu.salesforce.auth.SalesforceAuthenticate.SalesforceAuth
import com.gu.util.Logging
import com.gu.util.config.ConfigLocation
import com.gu.util.reader.Types.{ApiGatewayOp, _}
import com.gu.util.zuora.RestRequestMaker
import com.gu.util.zuora.RestRequestMaker.ClientSuccess
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
    implicit val location = ConfigLocation[SFAuthConfig](path = "sfAuth", version = 1)
  }
  object SFAuthTestConfig {
    implicit val reads: Reads[SFAuthConfig] = SFAuthConfig.reads
    implicit val location = ConfigLocation[SFAuthConfig](path = "TEST/sfAuth", version = 1)
  }

  // the WireResponse model is the same as the domain model, so keep a friendly name
  case class SalesforceAuth(access_token: String, instance_url: String)
  object SalesforceAuth {
    implicit val salesforceAuthReads: Reads[SalesforceAuth] = Json.reads[SalesforceAuth]
  }

  def doAuth(
    response: (Request => Response),
    config: SFAuthConfig
  ): ApiGatewayOp[SalesforceAuth] = {
    val request: Request = buildAuthRequest(config)
    val body = response(request).body().string()
    Json.parse(body).validate[SalesforceAuth].toApiGatewayOp("Failed to authenticate with Salesforce").withLogging(s"salesforce auth for $body")
  }

  def apply(
    response: (Request => Response),
    config: SFAuthConfig
  ): ApiGatewayOp[RestRequestMaker.Requests] = {
    doAuth(response, config)
      .map(sfAuth => SalesforceRestRequestMaker(sfAuth, response))
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

object SalesforceRestRequestMaker extends Logging {

  def apply(salesforceAuth: SalesforceAuth, response: Request => Response): RestRequestMaker.Requests = {
    new RestRequestMaker.Requests(
      headers = Map("Authorization" -> s"Bearer ${salesforceAuth.access_token}"),
      baseUrl = salesforceAuth.instance_url,
      getResponse = response,
      jsonIsSuccessful = _ => ClientSuccess(())
    )
  }

}

