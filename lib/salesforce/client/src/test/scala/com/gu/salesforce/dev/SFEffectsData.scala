package com.gu.salesforce.dev

import com.gu.salesforce.TypesForSFEffectsData.{SFAccountId, SFContactId}

object SFEffectsData {
  // this class represents a compile safe set of data that we (hope) is present in code sf for the Effects tests.

  // this has the first name and last name, but no record type or country
  val testContactHasNamePhoneOtherAddress = SFContactId("0036E00000WtQpJQAV")
  val testAccountHasNamePhoneOtherAddress = SFAccountId("0016E00000gX3xGQAS")

  // this contact we can update the identity id freely
  val updateIdentityIdEmailAndFirstNameContact = SFContactId("0036E00000Ho05i")
}
