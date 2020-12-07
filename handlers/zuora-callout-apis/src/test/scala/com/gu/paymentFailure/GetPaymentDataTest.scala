package com.gu.paymentFailure

import com.gu.TestData.{accountId, weirdInvoiceTransactionSummary}
import org.scalatest.flatspec.AnyFlatSpec

class GetPaymentDataTest extends AnyFlatSpec {

  "getPaymentData" should "identify the correct product information" in {
    val actual = GetPaymentData(accountId)(weirdInvoiceTransactionSummary).map(_.product)
    assert(actual == Right("Supporter"))
  }

}
