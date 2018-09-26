package com.gu.salesforce

import com.gu.util.Logging
import com.gu.util.config.ConfigLocation
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker.toClientFailableOp
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
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

  def apply(response: Request => Response): SFAuthConfig => LazyClientFailableOp[SalesforceAuth] =
    HttpOp(response).setupRequest(buildAuthRequest).flatMap(toClientFailableOp).map { response =>
      Json.parse(response.value)
    }.parse[SalesforceAuth].map(_.withLogging(s"salesforce auth")).runRequestLazy

}
