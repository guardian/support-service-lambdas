package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.productcatalog.AmountMinorUnits

object Formatters {
  implicit class AmountOps(amountMinorUnits: AmountMinorUnits) {
    def prettyPrint: String = (amountMinorUnits.value / BigDecimal(100)).bigDecimal.setScale(2).toPlainString
  }
}
