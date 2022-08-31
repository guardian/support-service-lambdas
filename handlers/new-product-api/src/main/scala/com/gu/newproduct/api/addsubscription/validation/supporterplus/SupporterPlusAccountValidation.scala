package com.gu.newproduct.api.addsubscription.validation.supporterplus

import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed, ValidatedAccount, ValidationResult}

object SupporterPlusAccountValidation {
  def apply(account: ValidatedAccount): ValidationResult[ValidatedAccount] = {
    account.identityId match {
      case Some(_) => Passed(account)
      case None => Failed("Zuora account has no Identity Id")
    }
  }
}