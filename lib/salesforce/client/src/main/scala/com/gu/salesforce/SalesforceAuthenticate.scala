package com.gu.salesforce

import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker.toClientFailableOp
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import okhttp3.{FormBody, Request, Response}
import play.api.libs.json.Json
import com.gu.salesforce.SalesforceReads._

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

  def apply(response: Request => Response): SFAuthConfig => LazyClientFailableOp[SalesforceAuth] =
    HttpOp(response)
      .setupRequest(buildAuthRequest)
      .flatMap(toClientFailableOp)
      .map { response =>
        Json.parse(response.value)
      }
      .parse[SalesforceAuth]
      .map(_.withLogging(s"salesforce auth"))
      .runRequestLazy

}
