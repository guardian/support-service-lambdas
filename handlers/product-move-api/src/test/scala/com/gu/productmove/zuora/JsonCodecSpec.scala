package com.gu.productmove.zuora

import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.zuora.GetAccount.BasicInfo

import collection.mutable.Stack
import org.scalatest.*
import zio.json.*
import flatspec.*
import matchers.*

import java.time.LocalDate
import scala.io.Source

class JsonCodecSpec extends AnyFlatSpec {
  it should "JSON Decoding: null fields should convert to type None" in {
    val json = Source.fromResource("AccountBasicInfo2.json").mkString
    val expectedBasicInfo = BasicInfo(DefaultPaymentMethod("2c92a0fd590128e4015902ad34001c1f", None), None, "0030J00001tCDhGAMKL", 0.0, Currency.GBP)

    val basicInfo = json.fromJson[BasicInfo].getOrElse("")

    assert(basicInfo == expectedBasicInfo)
  }

  it should "JSON Decoding: empty strings should convert to type None" in {
    val json = Source.fromResource("AccountBasicInfo.json").mkString
    val expectedBasicInfo = BasicInfo(DefaultPaymentMethod("2c92a0fd590128e4015902ad34001c1f", None), None, "0030J00001tCDhGAMKL", 0.0, Currency.GBP)

    val basicInfo = json.fromJson[BasicInfo].getOrElse("")

    assert(basicInfo == expectedBasicInfo)
  }
}
