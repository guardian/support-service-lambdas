package com.gu.identityBackfill

object Types {

  case class EmailAddress(value: String)
  case class IdentityId(value: String)
  case class SFContactId(value: String)
  case class AccountId(value: String)

  case class ZuoraAccountIdentitySFContact(
    accountId: AccountId,
    identityId: Option[IdentityId],
    sfContactId: SFContactId
  )

}
