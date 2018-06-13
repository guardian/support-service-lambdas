package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.ZuoraQuery.{Query, ZuoraQuerier}
import play.api.libs.json.Json
import scalaz.ListT

object GetZuoraAccountsForEmail {

  case class WireResponseContact(Id: String)
  implicit val readsC = Json.reads[WireResponseContact]
  case class WireResponseAccount(
    Id: String,
    IdentityId__c: Option[String],
    sfContactId__c: String
  )
  implicit val readsA = Json.reads[WireResponseAccount]

  def apply(zuoraQuerier: ZuoraQuerier)(emailAddress: EmailAddress): ClientFailableOp[List[ZuoraAccountIdentitySFContact]] = {
    val accounts = for {
      contactWithEmail <- {
        val contactQuery = zoql"SELECT Id FROM Contact where WorkEmail=${emailAddress.value}"
        ListT(zuoraQuerier[WireResponseContact](contactQuery).map(_.records))
      }
      accountsWithEmail <- {
        val accountQuery = zoql"SELECT Id, IdentityId__c, sfContactId__c FROM Account where BillToId=${contactWithEmail.Id}"
        ListT[ClientFailableOp, WireResponseAccount](zuoraQuerier[WireResponseAccount](accountQuery).map(_.records))
      }
    } yield ZuoraAccountIdentitySFContact(
      AccountId(accountsWithEmail.Id),
      accountsWithEmail.IdentityId__c.map(IdentityId.apply),
      SFContactId(accountsWithEmail.sfContactId__c)
    )

    accounts.run
  }

}
