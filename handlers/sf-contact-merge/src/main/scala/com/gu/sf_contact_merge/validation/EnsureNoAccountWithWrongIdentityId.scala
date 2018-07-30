package com.gu.sf_contact_merge.validation

import com.gu.sf_contact_merge.validation.GetContacts.IdentityId

object EnsureNoAccountWithWrongIdentityId { // make sure all accounts are either this identity id or none
  def apply(
    accounts: List[Option[IdentityId]],
    maybeCorrectIdentityId: Option[IdentityId]
  ): Option[String] = //FIXME use the validation from new-product-api
    maybeCorrectIdentityId match {
      case Some(correctIdentityId) =>
        val wrongIdentityIdIsThere = accounts.filter(_.exists(_ != correctIdentityId))
        if (wrongIdentityIdIsThere.nonEmpty)
          Some(
            s"one of the accounts had an unexpected identity id other than: $correctIdentityId - can't merge yet: $wrongIdentityIdIsThere"
          )
        else
          None
      case None =>
        val hasIdentityButWillLoseIt = accounts.filter(_.isDefined)
        if (hasIdentityButWillLoseIt.nonEmpty)
          Some(s"one of the accounts had an identity id but will lose it: $hasIdentityButWillLoseIt")
        else
          None
    }

}
