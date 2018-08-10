package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetSalesforceIdentityId {

  case class WireResult(IdentityID__c: String)
  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(get: RestRequestMaker.Requests)(sFContactId: SFContactId): ClientFailableOp[IdentityId] = {
    val id = get.get[WireResult](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    id.map(id => IdentityId(id.IdentityID__c))
  }

}
