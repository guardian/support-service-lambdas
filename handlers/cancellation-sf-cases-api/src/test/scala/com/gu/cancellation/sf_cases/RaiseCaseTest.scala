package com.gu.cancellation.sf_cases

import com.gu.cancellation.sf_cases.RaiseCase._
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class RaiseCaseTest extends AnyFlatSpec with Matchers with EitherValues {

  it should "deserialise input" in {

    val testString = "Membership"

    val jsonData = s""""$testString""""

    val expected = ProductName(testString)
    val actual = Json.fromJson[ProductName](Json.parse(jsonData))

    actual.asEither.value shouldEqual expected

  }

  it should "serialise class" in {

    val testString = "Membership"

    val expected = s""""$testString""""

    val testData = ProductName(testString)
    val actual = Json.stringify(Json.toJson(testData))

    actual shouldEqual expected

  }

}
