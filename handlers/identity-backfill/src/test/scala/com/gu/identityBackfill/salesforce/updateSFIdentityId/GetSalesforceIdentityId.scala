package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SalesforceAuth
import com.gu.identityBackfill.salesforce.SalesforceRestRequestMaker
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import okhttp3.{Request, Response}
import play.api.libs.json.Json

object GetSalesforceIdentityId {

  case class WireResult(IdentityID__c: String)
  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(response: Request => Response)(salesforceAuth: SalesforceAuth)(sFContactId: SFContactId): FailableOp[IdentityId] = {
    val get = SalesforceRestRequestMaker(salesforceAuth, response)
    val id = get.get[WireResult](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    id.bimap(e => ApiGatewayResponse.internalServerError(e.message), id => IdentityId(id.IdentityID__c))
  }

}
