package com.gu.newproduct.api.addsubscription

object Formatters {
  implicit class AmountOps(amountMinorUnits: AmountMinorUnits) {
    def formatted: String = (amountMinorUnits.value / BigDecimal(100)).bigDecimal.setScale(2).toPlainString
  }
}
