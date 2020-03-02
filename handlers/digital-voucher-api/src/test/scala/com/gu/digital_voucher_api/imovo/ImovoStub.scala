package com.gu.digital_voucher_api.imovo

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Method, Request, Response}
import io.circe.Encoder
import io.circe.syntax._
import cats.implicits._

object ImovoStub {
  class ImovoStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S]) {

    def stubCreate[A: Encoder](apiKey: String, baseUrl: String, customerRef: String, campaignCode: String, startDate: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryCreate(apiKey, baseUrl, customerRef, campaignCode, startDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubCreateSubscription[A: Encoder](apiKey: String, baseUrl: String, subscriptionId: String, schemeName: String, startDate: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryCreateSubscription(apiKey, baseUrl, subscriptionId, schemeName, startDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubReplace[A: Encoder](apiKey: String, baseUrl: String, voucherCode: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesReplaceRequest(apiKey, baseUrl, voucherCode, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubUpdate[A: Encoder](apiKey: String, baseUrl: String, voucherCode: String, expiryDate: Option[LocalDate], response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesUpdateRequest(apiKey, baseUrl, voucherCode, expiryDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }
  }

  private def matchesQueryCreate[S, F[_]](apiKey: String, baseUrl: String, customerRef: String, campaignCode: String, startDate: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) == s"$baseUrl//VoucherRequest/Request"
    val methodMatches = request.method == Method.GET
    val queryParamsMatch = {
      val params = request.uri.paramsMap
      params.get("customerReference").contains(customerRef) &&
        params.get("campaignCode").contains(campaignCode) &&
        params.get("StartDate").contains(startDate)
    }
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY").contains(apiKey)
    urlMatches && methodMatches && queryParamsMatch && apiKeyMatches
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

  private def matchesReplaceRequest[S, F[_]](apiKey: String, baseUrl: String, voucherCode: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl//Subscription/ReplaceVoucher"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("VoucherCode").contains(voucherCode)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY") === Some(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesUpdateRequest[S, F[_]](apiKey: String, baseUrl: String, voucherCode: String, expiryDate: Option[LocalDate], request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl/Voucher/Update/"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("VoucherCode") === Some(voucherCode) &&
      request.uri.paramsMap.get("ExpiryDate") === expiryDate.map(DateTimeFormatter.ISO_DATE.format)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY") === Some(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  implicit def implicitStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new ImovoStubSttpBackendStubOps[F, Nothing](sttpStub)

}
