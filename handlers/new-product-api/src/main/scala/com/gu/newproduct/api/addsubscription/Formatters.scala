package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.SortCode

object Formatters {
  implicit class AmountOps(sortCode: SortCode) {
    def hyphenated = s"${sortCode.value.substring(0, 2)}-${sortCode.value.substring(2, 4)}-${sortCode.value.substring(4, 6)}"
  }
}
