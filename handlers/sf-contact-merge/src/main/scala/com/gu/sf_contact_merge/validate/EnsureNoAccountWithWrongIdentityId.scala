package com.gu.sf_contact_merge.validate

import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import scalaz.{-\/, \/, \/-}

object EnsureNoAccountWithWrongIdentityId {

  val apply: EnsureNoAccountWithWrongIdentityId =
    (accounts: List[Option[IdentityId]]) =>
      accounts.flatten.distinct match {
        case Nil => \/-(None)
        case id :: Nil => \/-(Some(id))
        case multi => -\/(s"there are multiple identity ids: $multi")
      }

}

trait EnsureNoAccountWithWrongIdentityId {

  def apply(accounts: List[Option[IdentityId]]): String \/ Option[IdentityId]

}
