package com.gu.newproduct.api.addsubscription.validation.paper

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount, ValidationResult}

object PaperAccountValidation {
  def apply(
      account: ValidatedAccount,
  ): ValidationResult[ValidatedAccount] = {
    account.currency match {
      case GBP => Passed(account)
      case other => Failed(s"Invalid currency in Zuora account: $other. Only GBP is allowed for the selected plan")
    }
  }
}
