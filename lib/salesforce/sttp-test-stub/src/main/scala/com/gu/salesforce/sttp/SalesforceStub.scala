package com.gu.salesforce.sttp

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth, SalesforceConstants}
import com.softwaremill.sttp.{Id, MediaTypes, Method, Request, RequestBody, Response, StatusCode, StringBody}
import com.softwaremill.sttp.testing.SttpBackendStub

object SalesforceStub {
  class SalesforceStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S]) {
    def stubAuth(config: SFAuthConfig, auth: SalesforceAuth) = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesAuthRequest(config, request) =>
          Response.ok(Right(auth))
      }
    }

    def stubQuery(auth: SalesforceAuth, query: String, responseString: String): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryRequest(auth, query, request) =>
          Response.ok(responseString)
      }
    }
  }

  private def matchesAuthRequest[S, F[_]](config: SFAuthConfig, request: Request[_, _]) = {
    val urlMatches = request.uri.toString() == (config.url + "/services/oauth2/token")
    val bodyMatches = request.body == StringBody(
      s"client_id=${config.client_id}&" +
      s"client_secret=${config.client_secret}&username=${config.username}&" +
      s"password=${config.password + config.token}&grant_type=password",
      "utf-8",
      Some(MediaTypes.Text)
    )
    urlMatches && bodyMatches
  }

  private def matchesQueryRequest[S, F[_]](auth: SalesforceAuth, query: String, request: Request[_, _]) = {
    urlNoQueryString(request) == auth.instance_url + SalesforceConstants.soqlQueryBaseUrl &&
      request.method == Method.GET &&
      request.uri.paramsMap.get("q") == Some(query)
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  implicit def syncStub(sttpStub: SttpBackendStub[Id, Nothing]) =
    new SalesforceStubSttpBackendStubOps[Id, Nothing](sttpStub)
}
