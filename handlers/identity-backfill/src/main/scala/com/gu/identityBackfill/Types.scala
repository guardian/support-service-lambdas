package com.gu.identityBackfill

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.TypesForSFEffectsData.SFAccountId

object Types {

  case class EmailAddress(value: String)
  case class AccountId(value: String)
  case class CrmId(value: String) {
    val asSFAccountId = SFAccountId(value)
  }

  case class ZuoraAccountIdentitySFContact(
      accountId: AccountId, // One of the buyer's Zuora Billing Accounts
      identityId: Option[IdentityId], // The buyer's GNM Identity account, if they have one
      sfContactId: SFContactId, // One of the buyer's CRM Contacts (most usually their own, but could be a gift recipient)
      crmId: CrmId, // The buyer's main CRM Account (which we're trying to link to their Identity account)
  )

}
