package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker
import play.api.libs.json.Json

object GetSalesforceIdentityId {

  case class WireResult(IdentityID__c: String)
  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(get: RestRequestMaker.Requests)(sFContactId: SFContactId): ApiGatewayOp[IdentityId] = {
    val id = get.get[WireResult](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    id.toApiGatewayOp("failed").map(id => IdentityId(id.IdentityID__c))
  }

}
