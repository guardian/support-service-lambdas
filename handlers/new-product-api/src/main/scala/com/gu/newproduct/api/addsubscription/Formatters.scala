package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.SortCode
import com.gu.newproduct.api.productcatalog.AmountMinorUnits

object Formatters {

  implicit class AmountOps(amountMinorUnits: AmountMinorUnits) {
    def formatted: String = (amountMinorUnits.value / BigDecimal(100)).bigDecimal.setScale(2).toPlainString
  }

  implicit class SortCodeOps(sortCode: SortCode) {
    def hyphenated =
      s"${sortCode.value.substring(0, 2)}-${sortCode.value.substring(2, 4)}-${sortCode.value.substring(4, 6)}"
  }

}
