package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class EnsureNoAccountWithWrongIdentityIdTest extends FlatSpec with Matchers {

  it should "get a single identity id correctly" in {

    val maybeIdentityId = Some(IdentityId("newidid"))
    val existingAccounts = List(maybeIdentityId)

    val actual = EnsureNoAccountWithWrongIdentityId.apply(existingAccounts)

    actual should be(\/-(maybeIdentityId))
  }

  it should "return none when there's no identity" in {

    val maybeIdentityId = None
    val existingAccounts = List(maybeIdentityId)

    val actual = EnsureNoAccountWithWrongIdentityId.apply(existingAccounts)

    actual should be(\/-(maybeIdentityId))
  }

  it should "FAIL when we update to an identity id which is contradicted" in {

    val maybeIdentityId1 = Some(IdentityId("newidid1"))
    val maybeIdentityId2 = Some(IdentityId("newidid2"))
    val existingAccounts = List(maybeIdentityId1, maybeIdentityId2)

    val actual = EnsureNoAccountWithWrongIdentityId.apply(existingAccounts)

    actual.leftMap(_.split(":")(0)) should be(-\/("there are multiple identity ids"))
  }

  it should "get a single identity id correctly when duplicated and with Nones" in {

    val maybeIdentityId = Some(IdentityId("newidid"))
    val existingAccounts = List(None, maybeIdentityId, None, maybeIdentityId)

    val actual = EnsureNoAccountWithWrongIdentityId.apply(existingAccounts)

    actual should be(\/-(maybeIdentityId))
  }

}
