package com.gu.zuora.reports.aqua

import com.gu.util.resthttp.Types.ClientSuccess
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsValue, Json}

class ZuoraAquaRequestMakerTest extends AnyFlatSpec with Matchers {
  "oauth" should "use a Bearer token for AQuA requests" in {
    val response = (request: Request) => {
      request.url().toString shouldBe "https://rest.apisandbox.zuora.com/v1/batch-query/jobs/job-1"
      request.header("Authorization") shouldBe "Bearer test-token"
      request.header("Accept-Encoding") shouldBe "identity"
      new Response.Builder()
        .request(request)
        .protocol(Protocol.HTTP_1_1)
        .code(200)
        .message("OK")
        .body(ResponseBody.create("""{"status":"completed"}""", MediaType.parse("application/json")))
        .build()
    }
    val requests = ZuoraAquaRequestMaker.oauth(
      response,
      "https://rest.apisandbox.zuora.com/v1",
      "test-token",
    )

    requests.get[JsValue]("batch-query/jobs/job-1") shouldBe ClientSuccess(Json.obj("status" -> "completed"))
  }
}
