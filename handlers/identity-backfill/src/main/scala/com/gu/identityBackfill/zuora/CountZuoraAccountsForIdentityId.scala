package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json

object CountZuoraAccountsForIdentityId {

  case class WireResponse(Id: String)
  implicit val reads = Json.reads[WireResponse]

  def apply(zuoraQuerier: ZuoraQuerier)(identityId: IdentityId): ClientFailableOp[Int] =
    for {
      accountByIdentityQuery <- zoql"SELECT Id FROM Account where IdentityId__c=${identityId.value}"
      noOfAccountsWithID <- zuoraQuerier[WireResponse](accountByIdentityQuery)
    } yield noOfAccountsWithID.size

}
