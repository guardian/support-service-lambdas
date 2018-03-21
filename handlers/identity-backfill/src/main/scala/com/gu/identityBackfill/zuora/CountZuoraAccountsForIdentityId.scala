package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types.{AccountId, IdentityId}
import com.gu.identityBackfill.zuora.CountZuoraAccountsForIdentityId.WireModel.ZuoraAccount
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.{ZuoraDeps, ZuoraQuery}
import play.api.libs.json.Json

import scalaz.ListT

object CountZuoraAccountsForIdentityId {
  object WireModel {

    case class ZuoraAccount(
      Id: String
    )
    implicit val zaReads = Json.reads[ZuoraAccount]

  }

  def apply(zuoraDeps: ZuoraDeps)(identityId: IdentityId): FailableOp[Int] = {
    val accounts = for {
      accountsWithEmail <- ListT(ZuoraQuery.getResults[ZuoraAccount](ZuoraQuery.Query(s"SELECT Id FROM Account where IdentityId__c='${identityId.value}'")).map(_.records))
    } yield AccountId(accountsWithEmail.Id)

    accounts.run.run.run(zuoraDeps).bimap(e => ApiGatewayResponse.internalServerError(e.message), l => l.size)
  }

}
