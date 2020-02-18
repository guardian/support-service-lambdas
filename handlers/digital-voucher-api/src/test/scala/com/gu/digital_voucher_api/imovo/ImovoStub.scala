package com.gu.digital_voucher_api.imovo

import com.softwaremill.sttp.testing.SttpBackendStub
import com.softwaremill.sttp.{Method, Request, Response}
import io.circe.Encoder
import io.circe.syntax._

object ImovoStub {
  class ImovoStubSttpBackendStubOps[F[_], S](sttpStub: SttpBackendStub[F, S]) {
    def stubCreate[A: Encoder](apiKey: String, baseUrl: String, customerRef: String, campaignCode: String, startDate: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryCreate(apiKey, baseUrl, customerRef, campaignCode, startDate, request) =>
          Response.ok(response.asJson.spaces2)
      }
    }
    def stubReplace[A: Encoder](apiKey: String, baseUrl: String, voucherCode: String, response: A): SttpBackendStub[F, S] = {
      sttpStub.whenRequestMatchesPartial {
        case request: Request[_, _] if matchesQueryRequest(apiKey, baseUrl, voucherCode, request) =>
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

  private def matchesQueryRequest[S, F[_]](apiKey: String, baseUrl: String, voucherCode: String, request: Request[_, _]) = {
    val urlMatches = urlNoQueryString(request) == s"$baseUrl//Subscription/ReplaceVoucher"
    val methodMatches = request.method == Method.GET
    val queryParamMatches = request.uri.paramsMap.get("VoucherCode").contains(voucherCode)
    val apiKeyMatches = request.headers.toMap.get("X-API-KEY").contains(apiKey)
    urlMatches && methodMatches && queryParamMatches && apiKeyMatches
  }

  private def urlNoQueryString[F[_], S](request: Request[_, _]) = {
    s"${request.uri.scheme}://${request.uri.host}/${request.uri.path.mkString("/")}"
  }

  implicit def implicitStub[F[_]](sttpStub: SttpBackendStub[F, Nothing]) =
    new ImovoStubSttpBackendStubOps[F, Nothing](sttpStub)

}
