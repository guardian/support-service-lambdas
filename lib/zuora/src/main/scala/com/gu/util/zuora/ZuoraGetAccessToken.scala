package com.gu.util.zuora

import com.gu.util.config.{LoadSecretsManagerConfig, Stage}
import com.gu.util.resthttp.{JsonHttp, RestRequestMaker}
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import com.gu.util.resthttp.Types.ClientFailableOp
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json._

import scala.util.Try

trait GetAccessToken {
  def get(): ClientFailableOp[String]
}

class ZuoraGetAccessToken(config: => ZuoraOAuthConfig, stage: String, getResponse: Request => Response)
    extends GetAccessToken {
  private lazy val credentials = config

  override def get(): ClientFailableOp[String] = {
    val body = new FormBody.Builder()
      .add("grant_type", "client_credentials")
      .add("client_id", credentials.clientId)
      .add("client_secret", credentials.clientSecret)
      .build()
    val request = new Request.Builder()
      .url(ZuoraOAuthConfig.serverUrl(stage) + "/oauth/token")
      .post(body)
      .build()
    for {
      response <- RestRequestMaker.sendRequest(request, getResponse)
      json <- JsonHttp.deserialiseJsonResponse(BodyAsString(response))
      token <- RestRequestMaker.toResult[String](json)(
        (JsPath \ "access_token")
          .read[String]
          .filter(JsonValidationError("OAuth token must not be empty"))(_.trim.nonEmpty),
      )
    } yield token
  }
}

object ZuoraGetAccessToken {
  def apply(
      stage: Stage,
      fetchSecret: String => Try[String],
      getResponse: Request => Response,
  ): ZuoraGetAccessToken =
    new ZuoraGetAccessToken(
      LoadSecretsManagerConfig(stage, fetchSecret).load[ZuoraOAuthConfig].fold(throw _, identity),
      stage.value,
      getResponse,
    )
}
