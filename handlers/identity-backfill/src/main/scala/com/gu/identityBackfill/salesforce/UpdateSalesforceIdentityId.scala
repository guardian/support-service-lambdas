package com.gu.identityBackfill.salesforce

import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker.Requests
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  implicit val writes = Json.writes[WireRequest]

  def apply(maybeSFRequests: FailableOp[Requests])(sFContactId: SFContactId, identityId: IdentityId): FailableOp[Unit] =
    maybeSFRequests.flatMap { sfRequests =>
      val patch = sfRequests.patch(WireRequest(identityId.value), s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
      patch.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
    }

}
