package com.gu.salesforce

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object SalesforceGenericIdLookup {

  case class SalesforceGenericIdLookupParams(sfObjectType: String, fieldName: String, lookupValue: String)

  type TSalesforceGenericIdLookup = SalesforceGenericIdLookupParams => ClientFailableOp[ResponseWithId]

  case class ResponseWithId(Id: String)
  implicit val reads = Json.reads[ResponseWithId]

  def apply(sfRequests: Requests)(params: SalesforceGenericIdLookupParams): ClientFailableOp[ResponseWithId] =
    sfRequests.get(s"/services/data/v29.0/sobjects/${params.sfObjectType}/${params.fieldName}/${params.lookupValue}")

}
