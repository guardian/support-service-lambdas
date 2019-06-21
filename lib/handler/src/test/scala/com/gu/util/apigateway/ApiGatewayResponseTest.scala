package com.gu.util.apigateway

import com.gu.util.apigateway.ResponseModels.{ApiResponse, CacheNoCache, Headers}
import com.gu.util.apigateway.ResponseWriters._
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.Json

class ApiGatewayResponseTest extends FlatSpec {

  "ApiGatewayResponse" should "serialise success response" in {
    val data = ApiGatewayResponse.successfulExecution
    val expected =
      """{
        |"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"{\n  \"message\" : \"Success\"\n}"
        |}
      """.stripMargin
    val result = Json.toJson(data)
    result should be(Json.parse(expected))
  }

  "ApiGatewayResponse" should "serialise no content response" in {
    val data = ApiResponse("204", None, Headers(contentType = None, cache = CacheNoCache))
    val expected =
      """{
        |"statusCode":"204","headers":{"Cache-control":"no-store"},"body":null
        |}
      """.stripMargin
    val result = Json.toJson(data)
    result should be(Json.parse(expected))
  }

}
