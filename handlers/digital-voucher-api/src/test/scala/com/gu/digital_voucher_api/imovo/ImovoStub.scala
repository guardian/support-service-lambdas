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
    def stubReplace[A: Encoder](apiKey: String, baseUrl: String, voucherCode: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesReplaceRequest(apiKey, baseUrl, voucherCode, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }

    def stubGet[A: Encoder](apiKey: String, baseUrl: String, subscriptionId: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesGetRequest(apiKey, baseUrl, subscriptionId, request) =>
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

  private def matchesReplaceRequest[S, F[_]](apiKey: String, baseUrl: String, voucherCode: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl//Subscription/ReplaceVoucher"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("VoucherCode").contains(voucherCode)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY") === Some(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def matchesGetRequest[S, F[_]](apiKey: String, baseUrl: String, subscriptionId: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) === s"$baseUrl//Subscription/GetVoucher"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("SubscriptionId").contains(subscriptionId)
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
