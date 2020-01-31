package com.gu.salesforce.sttp

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth, SalesforceConstants}
import com.softwaremill.sttp.{MediaTypes, Method, Request, Response, StringBody}
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Encoder
import io.circe.syntax._

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

    def stubPatch(auth: SalesforceAuth): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesPatchRequest(auth, request) =>
          Response(Right("{}"), 204, "")
      }
    }

    def stubNextRecordLink(auth: SalesforceAuth, nextRecordLink: String, responseString: String): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesNextRecordsRequest(auth, nextRecordLink, request) =>
          Response.ok(responseString)
      }
    }
    def stubQuery[A: Encoder](auth: SalesforceAuth, query: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryRequest(auth, query, request) =>
          Response.ok(response.asJson.spaces2)
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
    val urlMatches = urlNoQueryString(request) == auth.instance_url + SalesforceConstants.soqlQueryBaseUrl
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("q").contains(query)
    urlMatches && methodMatches && queryParamMatches
  }

  private def matchesPatchRequest[S, F[_]](auth: SalesforceAuth, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).startsWith(auth.instance_url + SalesforceConstants.sfObjectsBaseUrl)
    val methodMatches = request.method == Method.PATCH
    urlMatches && methodMatches
  }

  private def matchesNextRecordsRequest[S, F[_]](auth: SalesforceAuth, nextRecordsLink: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) == auth.instance_url + nextRecordsLink
    val methodMatches = request.method == Method.GET
    urlMatches && methodMatches
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  implicit def implicitStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new SalesforceStubSttpBackendStubOps[F, Nothing](sttpStub)

}
