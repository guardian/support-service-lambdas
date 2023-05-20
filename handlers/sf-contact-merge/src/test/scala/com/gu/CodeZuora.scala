package com.gu

import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId

object CodeZuora {
  // this class represents a compile safe set of data that we (hope) is present in CODE zuora for the Effects tests.

  // this has the identity id, crm id and contact id updated by the tests
  val accountWithRandomLinks = AccountId("2c92c0f9624bbc5f016253e573970b16")

  val account1 = AccountId("2c92c0f8646e0a6601646ff9b98e7b5f")
  val account2 = AccountId("2c92c0f964db696f0164dc671eb0245f")

}
