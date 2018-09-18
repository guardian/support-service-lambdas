package com.gu.salesforce.auth

import com.gu.salesforce.auth.SalesforceAuthenticate.SalesforceAuth
import com.gu.util.Logging
import com.gu.util.config.ConfigLocation
import com.gu.util.reader.Types.{ApiGatewayOp, _}
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, PatchRequest, createBodyFromJs, toClientFailableOp}
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json.{JsValue, Json, Reads}

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
    response: Request => Response,
    config: SFAuthConfig
  ): ApiGatewayOp[SalesforceAuth] = {
    val request: Request = buildAuthRequest(config)
    val body = response(request).body().string()
    Json.parse(body).validate[SalesforceAuth].toApiGatewayOp("Failed to authenticate with Salesforce").withLogging(s"salesforce auth for $body")
  }

  def patch(
    response: Request => Response,
    sfAuth: SalesforceAuth
  ): HttpOp[PatchRequest, Unit] =
    HttpOp(response).setupRequest {
      SalesforceRestRequestMaker.patch(sfAuth)
    }.flatMap {
      toClientFailableOp
    }.flatMap { _ =>
      ClientSuccess(())
    }

  def get(
    response: Request => Response,
    sfAuth: SalesforceAuth
  ): HttpOp[GetRequest, JsValue] =
    HttpOp(response).setupRequest {
      SalesforceRestRequestMaker.get(sfAuth)
    }.flatMap {
      toClientFailableOp
    }.map { response =>
      Json.parse(response.body.string)
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

  @deprecated("prefer to use the patch and get functions")
  def apply(salesforceAuth: SalesforceAuth, response: Request => Response): RestRequestMaker.Requests = {
    new RestRequestMaker.Requests(
      headers = Map("Authorization" -> s"Bearer ${salesforceAuth.access_token}"),
      baseUrl = salesforceAuth.instance_url,
      getResponse = response,
      jsonIsSuccessful = _ => ClientSuccess(())
    )
  }

  //FIXME split so that people can prepend the auth and patch separately - probably move away from Request object
  def patch(salesforceAuth: SalesforceAuth)(patchRequest: PatchRequest): Request = {
    val headers = Map("Authorization" -> s"Bearer ${salesforceAuth.access_token}")
    val baseUrl = salesforceAuth.instance_url
    RestRequestMaker.buildRequest(headers, baseUrl + patchRequest.path.value, _.patch(createBodyFromJs(patchRequest.body)))
  }

  def get(salesforceAuth: SalesforceAuth)(getRequest: GetRequest): Request = {
    val headers = Map("Authorization" -> s"Bearer ${salesforceAuth.access_token}")
    val baseUrl = salesforceAuth.instance_url
    RestRequestMaker.buildRequest(headers, baseUrl + getRequest.path.value, _.get())
  }

}

