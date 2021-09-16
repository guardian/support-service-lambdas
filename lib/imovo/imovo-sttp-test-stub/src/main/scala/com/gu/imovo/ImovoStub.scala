package com.gu.imovo

import cats.syntax.all._
import io.circe.Encoder
import io.circe.syntax._
import sttp.client3.testing.SttpBackendStub
import sttp.client3.{Request, Response}
import sttp.model.Method

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

  private def methodIsGet(request: Request[_, _]) = request.method == Method.GET

  private def subscriptionIdMatches(subscriptionId: String, request: Request[_, _]) =
    request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId)

  private def apiKeyMatches(config: ImovoConfig, request: Request[_, _]) =
    request.headers
      .map(header => header.name -> header.value).toMap
      .get("X-API-KEY")
      .contains(config.imovoApiKey)

  private def matchesQueryCreateSubscription(config: ImovoConfig, subscriptionId: String, schemeName: String, startDate: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).contains(s"${config.imovoBaseUrl}/Subscription/RequestSubscriptionVouchers")
    val queryParamsMatch = {
      val params = request.uri.paramsMap
      params.get("SubscriptionId").contains(subscriptionId) &&
        params.get("SchemeName").contains(schemeName) &&
        params.get("StartDate").contains(startDate)
    }
    urlMatches && methodIsGet(request) && queryParamsMatch && apiKeyMatches(config, request)
  }

  private def matchesReplaceSubscriptionRequest(config: ImovoConfig, subscriptionId: String, imovoSubscriptionType: ImovoSubscriptionType, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).contains(s"${config.imovoBaseUrl}/Subscription/ReplaceVoucherBySubscriptionId")
    val queryParamMatches =
      request.uri.paramsMap.get("SubscriptionId").contains(subscriptionId) &&
        request.uri.paramsMap.get("SubscriptionType").contains(imovoSubscriptionType.value)
    urlMatches && methodIsGet(request) && queryParamMatches && apiKeyMatches(config, request)
  }

  private def matchesSubscriptionCancelRequest(config: ImovoConfig, subscriptionId: String, expiryDate: Option[LocalDate], request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).contains(s"${config.imovoBaseUrl}/Subscription/CancelSubscriptionVoucher")
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId") === Some(subscriptionId) &&
      request.uri.paramsMap.get("LastActiveDay") === expiryDate.map(DateTimeFormatter.ISO_DATE.format)
    urlMatches && methodIsGet(request) && queryParamMatches && apiKeyMatches(config, request)
  }

  private def matchesGetRequest(config: ImovoConfig, subscriptionId: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).contains(s"${config.imovoBaseUrl}/Subscription/GetSubscriptionVoucherDetails")
    urlMatches && methodIsGet(request) && subscriptionIdMatches(subscriptionId, request) && apiKeyMatches(config, request)
  }

  private def matchesRedemptionHistoryRequest(config: ImovoConfig, subscriptionId: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request).contains(s"${config.imovoBaseUrl}/Subscription/SubscriptionRedemptionHistory")
    urlMatches && methodIsGet(request) && subscriptionIdMatches(subscriptionId, request) && apiKeyMatches(config, request)
  }

  private def urlNoQueryString(request: Request[_, _]): Option[String] =
    for {
      scheme <- request.uri.scheme
      host <- request.uri.host
    } yield s"$scheme://$host/${request.uri.path.mkString("/")}"

  implicit def implicitImovoStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new ImovoStubSttpBackendStubOps[F, Nothing](sttpStub)

}
