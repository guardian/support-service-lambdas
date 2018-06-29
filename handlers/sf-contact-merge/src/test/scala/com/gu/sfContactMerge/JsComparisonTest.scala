package com.gu.sfContactMerge

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsSuccess, Json}

class JSComparisonTest extends FlatSpec with Matchers {

  import JsonMatchers._

  case class Simple(key: String)
  implicit val sR = Json.format[Simple]

  it should "handle missed fields as normal" in {
    val testData = """{}"""
    val actual = Json.parse(testData).validate[WithoutExtras[Simple]]
    actual.asEither.left.map(_.toString) should be(Left("List((/key,List(JsonValidationError(List(error.path.missing),WrappedArray()))))"))
  }

  it should "work with the correct fields" in {
    val testData = """{"key":"test"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[Simple]]
    actual should be(JsSuccess(WithoutExtras(Simple("test"))))
  }

  it should "fail for extra fields" in {
    val testData = """{"key":"test", "extra": "bad"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[Simple]]
    actual.asEither.left.map(_.toString) should be(Left("""List((,List(JsonValidationError(List(extra fields, {"key":"test"} == {"key":"test","extra":"bad"}),WrappedArray()))))"""))
  }

}

class JSComparisonEmdeddedTest extends FlatSpec with Matchers {

  import JsonMatchers._

  case class Simple(key: String)
  implicit val sR = Json.format[Simple]
  case class WithEmbed(embed: JsEmbedded[Simple])
  implicit val wR = Json.format[WithEmbed]

  it should "handle missed fields as normal" in {
    val testData = """{}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    actual.asEither.left.map(_.toString) should be(Left("List((/embed,List(JsonValidationError(List(error.path.missing),WrappedArray()))))"))
  }

  it should "handle missed fields in the nested class" in {
    val testData = """{"embed":"{}"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    actual.asEither.left.map(_.toString) should be(Left("List((/embed/key,List(JsonValidationError(List(error.path.missing),WrappedArray()))))"))
  }

  it should "work with the correct fields" in {
    val testData = """{"embed":"{\"key\":\"test\"  }"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    actual should be(JsSuccess(WithoutExtras(WithEmbed(JsEmbedded(Simple("test"))))))
  }

  it should "fail for extra fields in the nested class" in {
    val testData = """{"embed":"{\"key\":\"test\",  \"extra\":\"bad\"}"}"""
    val actual = Json.parse(testData).validate[WithoutExtras[WithEmbed]]
    actual.asEither.left.map(_.toString) should be(Left("List((/embed,List(JsonValidationError(List(extra fields, {\"key\":\"test\"} == {\"key\":\"test\",\"extra\":\"bad\"}),WrappedArray()))))"))
  }

}

