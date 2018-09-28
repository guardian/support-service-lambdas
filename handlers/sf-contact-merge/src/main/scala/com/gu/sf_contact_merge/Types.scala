package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId

object Types {

  case class IdentityId(value: String) extends AnyVal

  case class WinningSFContact(id: SFContactId)

}
