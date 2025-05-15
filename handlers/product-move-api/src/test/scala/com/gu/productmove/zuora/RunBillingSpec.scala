package com.gu.productmove.zuora

import com.gu.productmove.*
import com.gu.productmove.zuora.RunBilling.{RunBillingErrorResponse, RunBillingResponse, RunBillingSuccessResponse, ZuoraError}
import zio.*
import zio.json.*
import zio.test.*
import zio.test.Assertion.*

object RunBillingSpec extends ZIOSpecDefault {

  case class A(value: Int) derives JsonDecoder
  case class B(str: String) derives JsonDecoder

  override def spec: Spec[TestEnvironment with Scope, Any] =
    suite("RunBilling")(
      test("serialisers - failure case") {
        val testData = """[{"Errors":[{"Message":"The invoice will not be generated because there are no charges due on this account.","Code":"INVALID_VALUE"}],"Success":false}]"""
        val expected = Left(RunBillingErrorResponse(List(ZuoraError("INVALID_VALUE", "The invoice will not be generated because there are no charges due on this account."))))
        val actual = testData.fromJson[RunBillingResponse]
        assert(actual)(equalTo(Right(List(expected))))
      },
      test("serialisers - success case") {
        val testData =
          """[
            |{
            |"Success": true,
            |"Id": "2c93808457d787030157e0306cd13a86"
            |}
            |]""".stripMargin
        val expected = Right(RunBillingSuccessResponse(Id = "2c93808457d787030157e0306cd13a86"))
        val actual = testData.fromJson[RunBillingResponse]
        assert(actual)(equalTo(Right(List(expected))))
      },
    )
}
