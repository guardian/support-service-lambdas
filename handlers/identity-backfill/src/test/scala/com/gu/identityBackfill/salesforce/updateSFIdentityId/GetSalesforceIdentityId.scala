package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import play.api.libs.json.{JsValue, Json}

object GetSalesforceIdentityId {

  case class WireResult(IdentityID__c: String)
  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(getOp: HttpOp[GetRequest, JsValue]): SFContactId => LazyClientFailableOp[IdentityId] =
    getOp.setupRequest(toRequest).parse[WireResult].map(_.IdentityID__c).map(IdentityId.apply).runRequestLazy

  def toRequest(sfContactId: SFContactId) = GetRequest(RelativePath(s"/services/data/v$salesforceApiVersion/sobjects/Contact/${sfContactId.value}"))

}
