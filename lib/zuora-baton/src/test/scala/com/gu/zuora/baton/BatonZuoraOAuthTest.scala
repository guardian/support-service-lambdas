package com.gu.zuora.baton

import com.gu.util.config.Stage
import com.gu.util.zuora.ZuoraOAuthConfig
import okhttp3.{FormBody, MediaType, Protocol, Response, ResponseBody}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class BatonZuoraOAuthTest extends AnyFlatSpec with Matchers {
  "getAccessToken" should "authenticate with the Baton OAuth credentials" in {
    val config = BatonZuoraRestConfig(
      "https://rest.apisandbox.zuora.com/v1",
      BatonZuoraConfig(ZuoraOAuthConfig("baton-client", "baton-secret")),
    )

    val result = BatonZuoraOAuth.getAccessToken(
      config,
      Stage("CODE"),
      request => {
        request.url().toString shouldBe "https://rest.apisandbox.zuora.com/oauth/token"
        request.body() match {
          case form: FormBody =>
            (0 until form.size()).map(index => form.name(index) -> form.value(index)).toMap shouldBe Map(
              "grant_type" -> "client_credentials",
              "client_id" -> "baton-client",
              "client_secret" -> "baton-secret",
            )
          case other => fail(s"Unexpected token request body: $other")
        }
        new Response.Builder()
          .request(request)
          .protocol(Protocol.HTTP_1_1)
          .code(200)
          .message("OK")
          .body(ResponseBody.create("""{"access_token":"test-token"}""", MediaType.parse("application/json")))
          .build()
      },
    )

    result shouldBe Right("test-token")
  }
}
