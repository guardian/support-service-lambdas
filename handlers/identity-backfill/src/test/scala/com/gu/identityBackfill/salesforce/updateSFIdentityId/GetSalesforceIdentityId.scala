package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker
import play.api.libs.json.Json

object GetSalesforceIdentityId {

  case class WireResult(IdentityID__c: String)
  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(get: RestRequestMaker.Requests)(sFContactId: SFContactId): FailableOp[IdentityId] = {
    val id = get.get[WireResult](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    id.bimap(e => ApiGatewayResponse.internalServerError(e.message), id => IdentityId(id.IdentityID__c))
  }

}
