package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types.{AccountId, IdentityId}
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.ZuoraQuery
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import scalaz.ListT

object CountZuoraAccountsForIdentityId {

  case class WireResponse(Id: String)
  implicit val reads = Json.reads[WireResponse]

  def apply(zuoraQuerier: ZuoraQuerier)(identityId: IdentityId): ClientFailableOp[Int] = {
    val accountByIdentityQuery = ZuoraQuery.Query(s"SELECT Id FROM Account where IdentityId__c='${identityId.value}'")
    val accounts = for {
      accountsWithEmail <- ListT[ClientFailableOp, WireResponse](
        zuoraQuerier[WireResponse](accountByIdentityQuery).map(_.records)
      )
    } yield AccountId(accountsWithEmail.Id)

    accounts.run.map(_.size)
  }

}
