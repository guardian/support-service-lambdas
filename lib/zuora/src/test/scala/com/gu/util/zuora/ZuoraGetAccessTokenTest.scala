package com.gu.util.zuora

import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.Stage
import com.gu.util.resthttp.Types.ClientSuccess
import okhttp3.{FormBody, MediaType, Protocol, Request, Response, ResponseBody}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import scala.util.{Failure, Success}

class ZuoraGetAccessTokenTest extends AnyFlatSpec with Matchers {
  private val config = ZuoraOAuthConfig("test-client +", "test-secret &")

  private def response(request: Request, body: String, status: Int = 200): Response =
    new Response.Builder()
      .request(request)
      .protocol(Protocol.HTTP_1_1)
      .code(status)
      .message("scripted response")
      .body(ResponseBody.create(body, MediaType.parse("application/json")))
      .build()

  "ZuoraGetAccessToken" should "send form-encoded credentials to the token endpoint and fetch a new token on every call" in {
    var requests = 0
    val tokens = new ZuoraGetAccessToken(
      config,
      "CSBX",
      request => {
        requests += 1
        request.method() shouldBe "POST"
        request.url().toString shouldBe "https://rest.test.zuora.com/oauth/token"
        request.header("Authorization") shouldBe null
        request.body() match {
          case form: FormBody =>
            (0 until form.size()).map(index => form.name(index) -> form.value(index)).toMap shouldBe Map(
              "grant_type" -> "client_credentials",
              "client_id" -> config.clientId,
              "client_secret" -> config.clientSecret,
            )
          case other => fail(s"Unexpected token request body: $other")
        }
        response(request, s"""{"access_token":"token-$requests"}""")
      },
    )

    tokens.get() shouldBe ClientSuccess("token-1")
    tokens.get() shouldBe ClientSuccess("token-2")
    requests shouldBe 2
  }

  List(
    "malformed JSON" -> "not-json",
    "missing token" -> "{}",
    "non-string token" -> """{"access_token":1}""",
    "empty token" -> """{"access_token":""}""",
    "blank token" -> """{"access_token":" "}""",
  ).foreach { case (description, body) =>
    it should s"reject a token response with $description" in {
      val tokens = new ZuoraGetAccessToken(config, "CSBX", request => response(request, body))

      tokens.get().isFailure shouldBe true
    }
  }

  it should "surface a rejected token request without retrying it" in {
    var requests = 0
    val tokens = new ZuoraGetAccessToken(
      config,
      "CSBX",
      request => {
        requests += 1
        response(request, """{"error":"invalid_client"}""", 401)
      },
    )

    tokens.get().isFailure shouldBe true
    requests shouldBe 1
  }

  it should "load shared credentials lazily once through the companion while fetching a token on every call" in {
    var secretReads = 0
    var tokenRequests = 0
    val tokens = ZuoraGetAccessToken(
      Stage("CSBX"),
      secretId => {
        secretId shouldBe "CSBX/Zuora-OAuth/SupportServiceLambdas"
        secretReads += 1
        Success("""{"clientId":"test-client","clientSecret":"test-secret"}""")
      },
      request => {
        tokenRequests += 1
        response(request, s"""{"access_token":"token-$tokenRequests"}""")
      },
    )

    secretReads shouldBe 0
    tokenRequests shouldBe 0
    tokens.get() shouldBe ClientSuccess("token-1")
    tokens.get() shouldBe ClientSuccess("token-2")
    secretReads shouldBe 1
    tokenRequests shouldBe 2
  }

  it should "retry failed credential loading instead of caching the failure" in {
    var secretReads = 0
    var tokenRequests = 0
    val tokens = ZuoraGetAccessToken(
      Stage("CODE"),
      _ => {
        secretReads += 1
        if (secretReads == 1) Failure(new IllegalStateException("Temporary failure"))
        else Success("""{"clientId":"test-client","clientSecret":"test-secret"}""")
      },
      request => {
        tokenRequests += 1
        response(request, """{"access_token":"test-token"}""")
      },
    )

    intercept[ConfigFailure](tokens.get())
    tokenRequests shouldBe 0
    tokens.get() shouldBe ClientSuccess("test-token")
    tokens.get() shouldBe ClientSuccess("test-token")
    secretReads shouldBe 2
    tokenRequests shouldBe 2
  }
}
