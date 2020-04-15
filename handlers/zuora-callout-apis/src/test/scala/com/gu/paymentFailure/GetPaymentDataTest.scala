package com.gu.paymentFailure

import com.gu.TestData.{accountId, weirdInvoiceTransactionSummary}
import org.scalatest.FlatSpec

class GetPaymentDataTest extends FlatSpec {

  "getPaymentData" should "identify the correct product information" in {
    val actual = GetPaymentData(accountId)(weirdInvoiceTransactionSummary).map(_.product)
    assert(actual == Right("Supporter"))
  }

}
