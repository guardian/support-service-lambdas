package com.gu.contact_us_api

import com.gu.contact_us_api.ParserUtils.decode
import com.gu.contact_us_api.models.{ContactUsError, SFAuthSuccess}
import io.circe.generic.auto._
import io.circe.parser
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class ParserUtilsTests extends AnyFlatSpec with should.Matchers {

  private val token = "TOKEN"
  private val decodeTarget = "SFAuthSuccess"
  private val errorType = "Fatal"

  private val validJson = s"""{ "access_token": "$token" }"""

  private val invalidJson = "{ }"

  "decode" should "correctly return the case class when the decoding is successful" in {
    decode[SFAuthSuccess](validJson) shouldBe Right(SFAuthSuccess(token))
  }

  it should "correctly return a ContactUsError case class when the decoding fails" in {
    val errorDetails = parser
      .decode[SFAuthSuccess](invalidJson)
      .swap
      .map(i => s"Failed to decode JSON string into $decodeTarget: $i")
      .getOrElse("")

    decode[SFAuthSuccess](invalidJson, Some(decodeTarget), errorType) shouldBe Left(
      ContactUsError(errorType, errorDetails),
    )
  }

}
