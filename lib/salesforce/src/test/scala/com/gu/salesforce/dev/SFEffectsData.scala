package com.gu.salesforce.dev

import com.gu.salesforce.AnyVals.SFContactId

object SFEffectsData {
  // this class represents a compile safe set of data that we (hope) is present in dev zuora for the Effects tests.

  // this has the first name and last name, but no record type or country
  val testContact = SFContactId("0036E00000NLzPkQAL")

  val updateIdentityIdContact = SFContactId("0036E00000Ho05i")

}
