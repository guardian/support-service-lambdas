package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import org.scalatest.{FlatSpec, Matchers}
import Formatters._

class FormattersTest extends FlatSpec with Matchers {
  it should "format 4 digit amount" in {
    val amount = AmountMinorUnits(1234)

    amount.prettyPrint shouldBe "12.34"
  }

  it should "format 3 digit amount" in {
    val amount = AmountMinorUnits(123)

    amount.prettyPrint shouldBe "1.23"
  }

  it should "format 2 digit amount" in {
    val amount = AmountMinorUnits(12)
    amount.prettyPrint shouldBe "0.12"
  }

  it should "format single digit amount" in {
    val amount = AmountMinorUnits(2)
    amount.prettyPrint shouldBe "0.02"
  }

  it should "don't strip zeros from decimal places" in {
    val amount = AmountMinorUnits(1200)

    amount.prettyPrint shouldBe "12.00"
  }

}
