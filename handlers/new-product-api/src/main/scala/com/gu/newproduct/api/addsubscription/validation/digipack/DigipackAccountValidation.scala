package com.gu.newproduct.api.addsubscription.validation.digipack

import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.{ValidatedAccount, ValidationResult}

object DigipackAccountValidation {
  val missingIdentityIdError = "Account has no associated identity Id"

  def apply(
      account: ValidatedAccount,
  ): ValidationResult[ValidatedAccount] = for {
    identityId <- account.identityId getOrFailWith (missingIdentityIdError)
    _ <- !identityId.value.trim.isEmpty orFailWith (missingIdentityIdError)
  } yield (account)
}
