package com.gu.salesforce.sttp

import cats.syntax.all._
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth, SalesforceConstants}
import io.circe.parser.decode
import io.circe.syntax._
import io.circe.{Decoder, Encoder}
import sttp.client3.testing.SttpBackendStub
import sttp.client3.{Request, Response, StringBody}
import sttp.model.{Method, StatusCode}

import java.net.URLEncoder

object SalesforceStub {
  class SalesforceStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S]) {
    def stubAuth(config: SFAuthConfig, auth: SalesforceAuth) = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesAuthRequest(config, request) =>
          Response.ok(Right(auth))
      }
    }

    def stubFailingAuth: SttpBackendStub[F, S] =
      sttpStub.whenAnyRequest.thenRespondServerError()

    def stubQuery(auth: SalesforceAuth, query: String, responseString: String): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryRequest(auth, query, request) =>
          Response.ok(responseString)
      }
    }

    def stubFailingQuery: SttpBackendStub[F, S] =
      sttpStub.whenAnyRequest.thenRespondServerError()

    def stubPatch(auth: SalesforceAuth): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesPatchRequest(auth, request) =>
          Response("", StatusCode.NoContent, "")
      }
    }

    def stubNextRecordLink(
        auth: SalesforceAuth,
        nextRecordLink: String,
        responseString: String,
    ): SttpBackendStub[F, S] = {
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

    def stubComposite[A: Decoder, B: Encoder](
        auth: SalesforceAuth,
        expectedRequest: Option[A],
        response: B,
    ): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesCompositeRequest(auth, expectedRequest, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }
  }

  private def matchesAuthRequest[S, F[_]](config: SFAuthConfig, request: Request[_, _]) = {
    val urlMatches = request.uri.toString() == (config.url + "/services/oauth2/token")
    val bodyMatches = request.body == StringBody(
      s"client_id=${URLEncoder.encode(config.client_id, "UTF-8")}&" +
        s"client_secret=${URLEncoder.encode(config.client_secret, "UTF-8")}&" +
        s"username=${URLEncoder.encode(config.username, "UTF-8")}&" +
        s"password=${URLEncoder.encode(config.password + config.token, "UTF-8")}&" +
        s"grant_type=password",
      "utf-8",
    )
    urlMatches && bodyMatches
  }

  private def matchesQueryRequest[S, F[_]](auth: SalesforceAuth, query: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).contains(auth.instance_url + SalesforceConstants.soqlQueryBaseUrl)
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("q").contains(query)
    urlMatches && methodMatches && queryParamMatches
  }

  private def matchesPatchRequest[S, F[_]](auth: SalesforceAuth, request: Request[_, _]) = {
    val urlMatches =
      urlNoQueryString(request).exists(_.startsWith(auth.instance_url + SalesforceConstants.sfObjectsBaseUrl))
    val methodMatches = request.method == Method.PATCH
    urlMatches && methodMatches
  }

  private def matchesCompositeRequest[S, F[_], A: Decoder](
      auth: SalesforceAuth,
      optionalExpectedRequestBody: Option[A],
      request: Request[_, _],
  ) = {
    val urlMatches =
      urlNoQueryString(request).exists(_.startsWith(auth.instance_url + SalesforceConstants.compositeBaseUrl))
    val methodMatches = request.method == Method.POST
    val bodyMatches = optionalExpectedRequestBody
      .map { expectedRequestBody => getBodyAs[A](request) == Right(expectedRequestBody) }
      .getOrElse(true)

    urlMatches && methodMatches && bodyMatches
  }

  private def matchesNextRecordsRequest[S, F[_]](
      auth: SalesforceAuth,
      nextRecordsLink: String,
      request: Request[_, _],
  ) = {
    val urlMatches = urlNoQueryString(request).contains(auth.instance_url + nextRecordsLink)
    val methodMatches = request.method == Method.GET
    urlMatches && methodMatches
  }

  private def urlNoQueryString(request: Request[_, _]): Option[String] =
    for {
      scheme <- request.uri.scheme
      host <- request.uri.host
    } yield s"$scheme://$host/${request.uri.path.mkString("/")}"

  private def getBodyAs[A: Decoder](request: Request[_, _]): Either[String, A] = {
    request.body match {
      case StringBody(bodyString, _, _) => decode[A](bodyString).leftMap(_.toString)
      case _ => "Body type not supported in test".asLeft[A]
    }
  }

  implicit def implicitSalesforceStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new SalesforceStubSttpBackendStubOps[F, Nothing](sttpStub)
}
