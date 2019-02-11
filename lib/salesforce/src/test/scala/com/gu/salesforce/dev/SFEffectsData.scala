package com.gu.salesforce.dev

import com.gu.salesforce.TypesForSFEffectsData.SFContactId

object SFEffectsData {
  // this class represents a compile safe set of data that we (hope) is present in dev sf for the Effects tests.

  // this has the first name and last name, but no record type or country
  val testContactHasNamePhoneOtherAddress = SFContactId("0036E00000WtQpJ")

  // this contact we can update the identity id freely
  val updateIdentityIdEmailAndFirstNameContact = SFContactId("0036E00000Ho05i")

}
