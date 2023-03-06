package com.gu.test

import play.api.libs.json.{JsSuccess, Json, JsonValidationError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class JSComparisonTest extends AnyFlatSpec with Matchers {

  import JsonMatchers._

  case class Simple(key: String)
  implicit val sR = Json.format[Simple]

  it should "handle missed fields as normal" in {
    val testData = """{}"""
    val actual = Json.parse(testData).validate[WithoutExtras[Simple]]
    val expectedError = "List((/key,List(JsonValidationError(List(error.path.missing),List()))))"
    actual.asEither.left.map(_.toString) should be(Left(expectedError))
  }

  it should "work with the correct fields" in {
    val testData = """{"key":"test"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[Simple]]
    actual should be(JsSuccess(WithoutExtras(Simple("test"))))
  }

  it should "fail for extra fields" in {
    val testData = """{"key":"test", "extra": "bad"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[Simple]]
    JsonValidationError
    val expectedError =
      """List((,List(JsonValidationError(List(extra fields, {"key":"test"} == {"key":"test","extra":"bad"}),List()))))"""
    actual.asEither.left.map(_.toString) should be(Left(expectedError))
  }

}

class JSComparisonEmdeddedTest extends AnyFlatSpec with Matchers {

  import JsonMatchers._

  case class Simple(key: String)
  implicit val sR = Json.format[Simple]
  case class WithEmbed(embed: JsStringContainingJson[Simple])
  implicit val wR = Json.format[WithEmbed]

  it should "handle missed fields as normal" in {
    val testData = """{}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    val expectedError = "List((/embed,List(JsonValidationError(List(error.path.missing),List()))))"
    actual.asEither.left.map(_.toString) should be(Left(expectedError))
  }

  it should "handle missed fields in the nested class" in {
    val testData = """{"embed":"{}"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    val expectedError = "List((/embed/key,List(JsonValidationError(List(error.path.missing),List()))))"
    actual.asEither.left.map(_.toString) should be(Left(expectedError))
  }

  it should "work with the correct fields" in {
    val testData = """{"embed":"{\"key\":\"test\"  }"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    actual should be(JsSuccess(WithoutExtras(WithEmbed(JsStringContainingJson(Simple("test"))))))
  }

  it should "fail for extra fields in the nested class" in {
    val testData = """{"embed":"{\"key\":\"test\",  \"extra\":\"bad\"}"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    val expectedError =
      "List((/embed,List(JsonValidationError(List(extra fields, {\"key\":\"test\"} == {\"key\":\"test\",\"extra\":\"bad\"}),List()))))"
    actual.asEither.left.map(_.toString) should be(Left(expectedError))
  }

}
