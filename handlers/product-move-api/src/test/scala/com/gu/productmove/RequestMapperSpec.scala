package com.gu.productmove

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2WebSocketEvent
import com.gu.productmove.framework.RequestMapper
import sttp.tapir.serverless.aws.lambda.{AwsHttp, AwsRequest, AwsRequestContext}
import zio.test.Assertion.equalTo
import zio.test.{ZIOSpecDefault, assert}
import zio.json.*

import scala.jdk.CollectionConverters.*

object RequestMapperQueryParamsSpec extends ZIOSpecDefault {

  def spec: zio.test.Spec[zio.test.TestEnvironment & zio.Scope, Any] = suite("RequestMapperQueryParamsSpec")(

    test("queryParamsToEncodedString can manage a normal key/value pair") {
      val testData = Map("aaa" -> "bbb")
      val result = RequestMapper.queryParamsToEncodedString(testData)
      assert(result)(equalTo("aaa=bbb"))
    },

    test("queryParamsToEncodedString can manage a query param with no separate value") {
      val testData = Map("aaa" -> "")
      val result = RequestMapper.queryParamsToEncodedString(testData)
      assert(result)(equalTo("aaa"))
    },

    test("queryParamsToEncodedString can manage a query string with strange characters") {
      val testData = Map("aaaa&aa?aa=aaaa"->"bbbb&bb?bb=bbbb")
      val result = RequestMapper.queryParamsToEncodedString(testData)
      assert(result)(equalTo("aaaa%26aa?aa%3Daaaa=bbbb%26bb?bb%3Dbbbb"))
    },

  )

}

object RequestMapperConvertSpec extends ZIOSpecDefault {

  def spec: zio.test.Spec[zio.test.TestEnvironment & zio.Scope, Any] = suite("RequestMapperConvertSpec")(

    test("convertJavaRequestToTapirRequest can manage a normal key/value pair") {
      val testData = {
        val identity = new APIGatewayV2WebSocketEvent.RequestIdentity()
        identity.setSourceIp("1.2.3.4")
        identity.setUserAgent("browser")
        val requestContext = new APIGatewayV2WebSocketEvent.RequestContext()
        requestContext.setIdentity(identity)
        requestContext.setDomainName("cheese.com")
        val testData = new APIGatewayV2WebSocketEvent()
        testData.setPath("/path")
        testData.setQueryStringParameters(Map("asdf" -> "").asJava)
        testData.setHeaders(Map("header" -> "headerValue").asJava)
        testData.setBody("body")
        testData.setHttpMethod("GET")
        testData.setIsBase64Encoded(false)
        testData.setRequestContext(requestContext)
        testData
      }
      val expected = AwsRequest(
        "/path",
        "asdf",
        Map("header" -> "headerValue"),
        AwsRequestContext(
          Some("cheese.com"),
          AwsHttp(
            "GET",
            "/path",
            "$.requestContext.protocol",// dummy value
            "1.2.3.4",
            "browser"
          )
        ),
        Some("body"),
        false
      )
      val result = RequestMapper.convertJavaRequestToTapirRequest(testData)
      assert(result)(equalTo(expected))
    },

  )

}
