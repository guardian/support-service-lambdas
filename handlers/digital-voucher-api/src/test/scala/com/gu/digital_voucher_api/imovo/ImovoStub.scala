package com.gu.digital_voucher_api.imovo

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Method, Request, Response}
import io.circe.Encoder
import io.circe.syntax._
import cats.implicits._
import com.gu.imovo.ImovoSubscriptionType

object ImovoStub {
  class ImovoStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S]) {

    def stubCreateSubscription[A: Encoder](apiKey: String, baseUrl: String, subscriptionId: String, schemeName: String, startDate: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryCreateSubscription(apiKey, baseUrl, subscriptionId, schemeName, startDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubReplaceSubscription[A: Encoder](apiKey: String, baseUrl: String, subscriptionId: String, imovoSubscriptionType: ImovoSubscriptionType, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesReplaceSubscriptionRequest(apiKey, baseUrl, subscriptionId, imovoSubscriptionType, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubSubscriptionCancel[A: Encoder](apiKey: String, baseUrl: String, subscriptionId: String, lastActiveDate: Option[LocalDate], response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesSubscriptionCancelRequest(apiKey, baseUrl, subscriptionId, lastActiveDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubGetSubscription[A: Encoder](apiKey: String, baseUrl: String, subscriptionId: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesGetRequest(apiKey, baseUrl, subscriptionId, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }
  }

  private def matchesQueryCreateSubscription[S, F[_]](apiKey: String, baseUrl: String, subscriptionId: String, schemeName: String, startDate: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) == s"$baseUrl/Subscription/RequestSubscriptionVouchers"
    val methodMatches = request.method == Method.GET
    val queryParamsMatch = {
      val params = request.uri.paramsMap
      params.get("SubscriptionId").contains(subscriptionId) &&
        params.get("SchemeName").contains(schemeName) &&
        params.get("StartDate").contains(startDate)
    }
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY").contains(apiKey)
    urlMatches && methodMatches && queryParamsMatch && apiKeyMatches
  }

  private def matchesReplaceSubscriptionRequest[S, F[_]](apiKey: String, baseUrl: String, subscriptionId: String, imovoSubscriptionType: ImovoSubscriptionType, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl/Subscription/ReplaceVoucherBySubscriptionId"
    val methodMatches = request.method == Method.GET
    val queryParamMatches =
      request.uri.paramsMap.get("SubscriptionId").contains(subscriptionId) &&
        request.uri.paramsMap.get("SubscriptionType").contains(imovoSubscriptionType.value)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY") === Some(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesSubscriptionCancelRequest[S, F[_]](apiKey: String, baseUrl: String, subscriptionId: String, expiryDate: Option[LocalDate], request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl/Subscription/CancelSubscriptionVoucher"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId) &&
      request.uri.paramsMap.get("LastActiveDay") === expiryDate.map(DateTimeFormatter.ISO_DATE.format)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY") === Some(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesGetRequest[S, F[_]](apiKey: String, baseUrl: String, subscriptionId: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl/Subscription/GetSubscriptionVoucherDetails"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY") === Some(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  implicit def implicitStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new ImovoStubSttpBackendStubOps[F, Nothing](sttpStub)

}
