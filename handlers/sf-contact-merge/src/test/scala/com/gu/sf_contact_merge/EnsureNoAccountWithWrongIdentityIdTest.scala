package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.validation.EnsureNoAccountWithWrongIdentityId
import com.gu.sf_contact_merge.validation.GetContacts.IdentityId
import org.scalatest.{FlatSpec, Matchers}

class EnsureNoAccountWithWrongIdentityIdTest extends FlatSpec with Matchers {

  it should "pass when we update to an identity id which is already" in {

    val existingAccounts = List(Some(IdentityId("newidid")))
    val newIdentityId = Some(IdentityId("newidid"))

    val actual = EnsureNoAccountWithWrongIdentityId(existingAccounts, newIdentityId)

    actual should be(None)
  }

  it should "pass when we update to an identity id which is not present at all" in {

    val existingAccounts = List(None)
    val newIdentityId = Some(IdentityId("newidid"))

    val actual = EnsureNoAccountWithWrongIdentityId(existingAccounts, newIdentityId)

    actual should be(None)
  }

  it should "pass when we ask to remove to a blank identity id and one is not present anyway" in {

    val existingAccounts = List(None)
    val newIdentityId = None

    val actual = EnsureNoAccountWithWrongIdentityId(existingAccounts, newIdentityId)

    actual should be(None)
  }

  it should "FAIL when we update to an identity id which is contradicted" in {

    val existingAccounts = List(Some(IdentityId("existingidid")))
    val newIdentityId = Some(IdentityId("newidid"))

    val actual = EnsureNoAccountWithWrongIdentityId(existingAccounts, newIdentityId)

    actual.map(_.split(":")(0)) should be(Some("one of the accounts had an unexpected identity id other than"))
  }

  it should "FAIL when we ask to remove to an identity id where one is already present" in {

    val existingAccounts = List(Some(IdentityId("existingidid")))
    val newIdentityId = None

    val actual = EnsureNoAccountWithWrongIdentityId(existingAccounts, newIdentityId)

    actual.map(_.split(":")(0)) should be(Some("one of the accounts had an identity id but will lose it"))
  }

}
