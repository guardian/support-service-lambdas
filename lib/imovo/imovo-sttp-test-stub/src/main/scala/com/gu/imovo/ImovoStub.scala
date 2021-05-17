package com.gu.imovo

import cats.syntax.all._
import io.circe.Encoder
import io.circe.syntax._
import sttp.client3._
import sttp.client3.testing.SttpBackendStub
import sttp.model.{Header, Method}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object ImovoStub {
  class ImovoStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S]) {

    def stubCreateSubscription[A: Encoder](config: ImovoConfig, subscriptionId: String, schemeName: String, startDate: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryCreateSubscription(config, subscriptionId, schemeName, startDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubReplaceSubscription[A: Encoder](config: ImovoConfig, subscriptionId: String, imovoSubscriptionType: ImovoSubscriptionType, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesReplaceSubscriptionRequest(config, subscriptionId, imovoSubscriptionType, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubSubscriptionCancel[A: Encoder](config: ImovoConfig, subscriptionId: String, lastActiveDate: Option[LocalDate], response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesSubscriptionCancelRequest(config, subscriptionId, lastActiveDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubGetSubscription[A: Encoder](config: ImovoConfig, subscriptionId: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesGetRequest(config, subscriptionId, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubRedemptionHistorySubscription[A: Encoder](config: ImovoConfig, subscriptionId: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesRedemptionHistoryRequest(config, subscriptionId, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

  }

  private def apiKey(headers: Seq[Header]): Option[String] = headers.find(_.name == "X-API-KEY").map(_.value)

  private def matchesQueryCreateSubscription[S, F[_]](config: ImovoConfig, subscriptionId: String, schemeName: String, startDate: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) == s"${config.imovoBaseUrl}/Subscription/RequestSubscriptionVouchers"
    val methodMatches = request.method == Method.GET
    val queryParamsMatch = {
      val params = request.uri.paramsMap
      params.get("SubscriptionId").contains(subscriptionId) &&
        params.get("SchemeName").contains(schemeName) &&
        params.get("StartDate").contains(startDate)
    }
    val apiKeyMatches = apiKey(request.headers).contains(config.imovoApiKey)
    urlMatches && methodMatches && queryParamsMatch && apiKeyMatches
  }

  private def matchesReplaceSubscriptionRequest[S, F[_]](config: ImovoConfig, subscriptionId: String, imovoSubscriptionType: ImovoSubscriptionType, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"${config.imovoBaseUrl}/Subscription/ReplaceVoucherBySubscriptionId"
    val methodMatches = request.method == Method.GET
    val queryParamMatches =
      request.uri.paramsMap.get("SubscriptionId").contains(subscriptionId) &&
        request.uri.paramsMap.get("SubscriptionType").contains(imovoSubscriptionType.value)
    val apiKeyMatches = apiKey(request.headers).contains(config.imovoApiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesSubscriptionCancelRequest[S, F[_]](config: ImovoConfig, subscriptionId: String, expiryDate: Option[LocalDate], request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"${config.imovoBaseUrl}/Subscription/CancelSubscriptionVoucher"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId) &&
      request.uri.paramsMap.get("LastActiveDay") === expiryDate.map(DateTimeFormatter.ISO_DATE.format)
    val apiKeyMatches = apiKey(request.headers).contains(config.imovoApiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesGetRequest[S, F[_]](config: ImovoConfig, subscriptionId: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"${config.imovoBaseUrl}/Subscription/GetSubscriptionVoucherDetails"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId)
    val apiKeyMatches = apiKey(request.headers).contains(config.imovoApiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesRedemptionHistoryRequest[S, F[_]](config: ImovoConfig, subscriptionId: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"${config.imovoBaseUrl}/Subscription/SubscriptionRedemptionHistory"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId)
    val apiKeyMatches = apiKey(request.headers).contains(config.imovoApiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  implicit def implicitImovoStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new ImovoStubSttpBackendStubOps[F, Nothing](sttpStub)

}
