package com.gu.newproduct.api.addsubscription

import org.scalatest.{FlatSpec, Matchers}
import Formatters._
import com.gu.newproduct.api.productcatalog.AmountMinorUnits

class FormattersTest extends FlatSpec with Matchers {
  it should "format 4 digit amount" in {
    val amount = AmountMinorUnits(1234)

    amount.formatted shouldBe "12.34"
  }

  it should "format 3 digit amount" in {
    val amount = AmountMinorUnits(123)

    amount.formatted shouldBe "1.23"
  }

  it should "format 2 digit amount" in {
    val amount = AmountMinorUnits(12)
    amount.formatted shouldBe "0.12"
  }

  it should "format single digit amount" in {
    val amount = AmountMinorUnits(2)
    amount.formatted shouldBe "0.02"
  }

  it should "don't strip zeros from decimal places" in {
    val amount = AmountMinorUnits(1200)

    amount.formatted shouldBe "12.00"
  }

}
