package com.gu.productmove.zuora

import com.gu.productmove.*
import com.gu.productmove.zuora.RunBilling.{
  RunBillingErrorResponse,
  RunBillingResponse,
  RunBillingSuccessResponse,
  ZuoraError,
}
import zio.*
import zio.json.*
import zio.test.*
import zio.test.Assertion.*

object PostInvoicesSpec extends ZIOSpecDefault {
  override def spec: Spec[TestEnvironment & Scope, Any] =
    suite("RunBilling")(
      test("serialisers - success case") {
        val testData = successJson
        val expected = Right(None)
        val actual = testData.fromJson[PostInvoices.PostInvoicesResponse].map(PostInvoices.maybeError)
        assert(actual)(equalTo(expected))
      },
      test("serialisers - expected failure case") {
        val testData = expectedFailureJson
        val expected = Right(None)
        val actual = testData.fromJson[PostInvoices.PostInvoicesResponse].map(PostInvoices.maybeError)
        assert(actual)(equalTo(expected))
      },
      test("serialisers - unexpected failure case") {
        val testData = failureJson
        val expected = Right(Some("dummy"))
        val actual = testData.fromJson[PostInvoices.PostInvoicesResponse].map(PostInvoices.maybeError)
        assert(actual.map(_.map(_ => "dummy")))(equalTo(expected))
      },
    )
}

val expectedFailureJson =
  """{
    |  "invoices" : [ {
    |    "success" : false,
    |    "processId" : "A76470DC0101BCBB",
    |    "reasons" : [ {
    |      "code" : 59210020,
    |      "message" : "Only invoices with Draft status can be posted."
    |    } ],
    |    "id" : "8ad083f096d239110196d438cee520d5"
    |  } ],
    |  "success" : true
    |}""".stripMargin

val failureJson =
  """{
    |  "invoices" : [ {
    |    "success" : false,
    |    "processId" : "A76470DC0101BCBB",
    |    "reasons" : [ {
    |      "code" : 1234,
    |      "message" : "This is not good."
    |    } ],
    |    "id" : "8ad083f096d239110196d438cee520d5"
    |  } ],
    |  "success" : true
    |}""".stripMargin

val successJson =
  """{
    |  "invoices" : [ {
    |    "success" : true,
    |    "id" : "8ad083f096d239110196d438cee520d5"
    |  } ],
    |  "success" : true
    |}""".stripMargin
