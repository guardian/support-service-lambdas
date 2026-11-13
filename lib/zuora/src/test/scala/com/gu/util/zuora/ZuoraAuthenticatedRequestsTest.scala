package com.gu.util.zuora

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsValue, Json}

import scala.collection.mutable.ListBuffer

class ZuoraAuthenticatedRequestsTest extends AnyFlatSpec with Matchers with EitherValues {
  "authenticated" should "fetch one token per client and keep it isolated from subsequently created clients" in {
    var tokenRequests = 0
    val observedTokens = ListBuffer.empty[String]
    val tokens = new GetAccessToken {
      override def get(): ClientFailableOp[String] = {
        tokenRequests += 1
        ClientSuccess(s"token-$tokenRequests")
      }
    }
    val response = (request: Request) => {
      request.url().toString shouldBe "https://rest.apisandbox.zuora.com/v1/accounts/account-1/summary"
      observedTokens += request.header("Authorization")
      new Response.Builder()
        .request(request)
        .protocol(Protocol.HTTP_1_1)
        .code(200)
        .message("OK")
        .body(ResponseBody.create("""{"success":true}""", MediaType.parse("application/json")))
        .build()
    }

    val first = ZuoraRestRequestMaker.authenticated(response, "CODE", tokens).toDisjunction.value
    val second = ZuoraRestRequestMaker.authenticated(response, "CODE", tokens).toDisjunction.value

    tokenRequests shouldBe 2
    observedTokens shouldBe empty
    first.get[JsValue]("accounts/account-1/summary") shouldBe ClientSuccess(Json.obj("success" -> true))
    second.get[JsValue]("accounts/account-1/summary") shouldBe ClientSuccess(Json.obj("success" -> true))
    observedTokens.toList shouldBe List("Bearer token-1", "Bearer token-2")
    tokenRequests shouldBe 2
  }

  it should "propagate token acquisition failure without making an API request or retrying" in {
    var tokenRequests = 0
    val failure = GenericError("Token unavailable")
    val tokens = new GetAccessToken {
      override def get(): ClientFailableOp[String] = {
        tokenRequests += 1
        failure
      }
    }

    ZuoraRestRequestMaker.authenticated(_ => fail("Unexpected API request"), "CODE", tokens) shouldBe failure
    tokenRequests shouldBe 1
  }
}
