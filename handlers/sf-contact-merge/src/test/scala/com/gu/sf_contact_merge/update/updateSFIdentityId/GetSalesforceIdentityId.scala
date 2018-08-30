package com.gu.sf_contact_merge.update.updateSFIdentityId

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetSalesforceIdentityId {

  case class WireResult(IdentityID__c: String, FirstName: String)
  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(get: RestRequestMaker.Requests)(sFContactId: SFContactId): ClientFailableOp[(IdentityId, FirstName)] = {
    val id = get.get[WireResult](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    id.map(id => (IdentityId(id.IdentityID__c), FirstName(id.FirstName)))
  }

}
