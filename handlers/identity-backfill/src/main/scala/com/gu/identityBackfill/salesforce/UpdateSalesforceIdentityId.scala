package com.gu.identityBackfill.salesforce

import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SalesforceAuth
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import okhttp3.{Request, Response}
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  object WireRequest {
    implicit val writes = Json.writes[WireRequest]
  }

  def apply(response: Request => Response)(salesforceAuth: SalesforceAuth)(sFContactId: SFContactId, identityId: IdentityId): FailableOp[Unit] = {
    val patch = SalesforceRestRequestMaker(salesforceAuth, response).patch(WireRequest(identityId.value), s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    patch.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
    //    ApiGatewayResponse.internalServerError("todo").left
  }

}
