package com.gu.identityBackfill

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.AnyVals.SFContactId

object Types {

  case class EmailAddress(value: String)
  case class AccountId(value: String)

  case class ZuoraAccountIdentitySFContact(
    accountId: AccountId,
    identityId: Option[IdentityId],
    sfContactId: SFContactId
  )

}
