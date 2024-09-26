package com.gu.salesforce

import com.gu.salesforce.SalesforceClient.SalesforceErrorResponseBody
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker.toClientFailableOp
import com.gu.util.resthttp.HttpOp
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json.Json
import com.gu.salesforce.SalesforceReads._

import scala.util.{Failure, Success, Try}

object SalesforceAuthenticate extends Logging {

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

  def auth(
      response: Request => Response,
      config: SFAuthConfig,
  ): Either[List[SalesforceErrorResponseBody], SalesforceAuth] =
    HttpOp(response)
      .setupRequest(buildAuthRequest)
      .flatMap(toClientFailableOp)
      .map { response =>
        Json.parse(response.value)
      }
      .parse[SalesforceAuth]
      .map(_.withLogging(s"salesforce auth"))
      .runRequest(config)
      .toDisjunction
      .left
      .map { cf =>
        Try(Json.parse(cf.body).as[List[SalesforceErrorResponseBody]]) match {
          case Success(value) => value
          case Failure(exception) =>
            logger.warn(s"salesforce auth response $cf not parsable as SalesforceErrorResponseBody" + exception)
            List()
        }
      }

}
