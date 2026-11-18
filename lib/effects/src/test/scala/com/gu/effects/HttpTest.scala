package com.gu.effects

import okhttp3.{FormBody, Request}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HttpTest extends AnyFlatSpec with Matchers {
  "requestSummary" should "not include request body credentials" in {
    val body = new FormBody.Builder()
      .add("client_id", "client-id")
      .add("client_secret", "client-secret")
      .build()
    val request = new Request.Builder()
      .url("https://example.com/services/oauth2/token")
      .post(body)
      .build()

    Http.requestSummary(request) shouldBe
      "HTTP request: POST https://example.com/services/oauth2/token"
  }
}
