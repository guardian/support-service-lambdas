package com.gu.digital_voucher_api

import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffMatcher
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class CreateVoucherRequestBodyTest
  extends AnyFlatSpec
  with should.Matchers
  with DiffMatcher
  with EitherValues {

  "Json decode" should "decode expected Json object successfully" in {
    val json = """{"ratePlanName": "Weekend"}"""
    decode[CreateVoucherRequestBody](json).value should matchTo(
      CreateVoucherRequestBody("Weekend")
    )
  }
}
