package com.gu.salesforce.sttp

import cats.syntax.all._
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth, SalesforceConstants}
import io.circe.parser.decode
import io.circe.syntax._
import io.circe.{Decoder, Encoder}
import sttp.client.testing.SttpBackendStub
import sttp.client.{Request, Response, StringBody}
import sttp.model.{MediaType, Method, StatusCode}

import java.net.URLEncoder

object SalesforceStub {
  class SalesforceStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S, Nothing]) {
    def stubAuth(config: SFAuthConfig, auth: SalesforceAuth): SttpBackendStub[F, S, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesAuthRequest(config, request) =>
          Response.ok(Right(auth))
      }
    }

    def stubQuery(auth: SalesforceAuth, query: String, responseString: String): SttpBackendStub[F, S, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryRequest(auth, query, request) =>
          Response.ok(responseString)
      }
    }

    def stubPatch(auth: SalesforceAuth): SttpBackendStub[F, S, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesPatchRequest(auth, request) =>
          Response(body = Right(""), code = StatusCode.NoContent, statusText = "")
      }
    }

    def stubNextRecordLink(auth: SalesforceAuth, nextRecordLink: String, responseString: String): SttpBackendStub[F, S, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesNextRecordsRequest(auth, nextRecordLink, request) =>
          Response.ok(responseString)
      }
    }
    def stubQuery[A: Encoder](auth: SalesforceAuth, query: String, response: A): SttpBackendStub[F, S, Nothing] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryRequest(auth, query, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }
    def stubComposite[A: Decoder, B: Encoder](
      auth: SalesforceAuth,
      expectedRequest: Option[A],
      response: B
    ): SttpBackendStub[F, S, Nothing] = {
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
      Some(MediaType.TextPlain)
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

  private def matchesCompositeRequest[S, F[_], A: Decoder](auth: SalesforceAuth, optionalExpectedRequestBody: Option[A], request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).startsWith(auth.instance_url + SalesforceConstants.compositeBaseUrl)
    val methodMatches = request.method == Method.POST
    val bodyMatches = optionalExpectedRequestBody.forall { expectedRequestBody => getBodyAs[A](request) == Right(expectedRequestBody) }

    urlMatches && methodMatches && bodyMatches
  }

  private def matchesNextRecordsRequest[S, F[_]](auth: SalesforceAuth, nextRecordsLink: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) == auth.instance_url + nextRecordsLink
    val methodMatches = request.method == Method.GET
    urlMatches && methodMatches
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  private def getBodyAs[A: Decoder](request: Request[_, _]): Either[String, A] = {
    request.body match {
      case StringBody(bodyString, _, _) => decode[A](bodyString).leftMap(_.toString)
      case _ => "Body type not supported in test".asLeft[A]
    }
  }

  implicit def implicitSalesforceStub[F[_]](sttpStub: SttpBackendStub[F, Nothing, Nothing]): SalesforceStubSttpBackendStubOps[F, Nothing] =
    new SalesforceStubSttpBackendStubOps[F, Nothing](sttpStub)
}
