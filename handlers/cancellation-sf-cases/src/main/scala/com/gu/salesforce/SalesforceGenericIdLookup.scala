package com.gu.salesforce

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.Json

object SalesforceGenericIdLookup {

  type TSalesforceGenericIdLookup = (String, String, String) => ClientFailableOp[ResponseWithId]

  case class ResponseWithId(Id: String)
  implicit val reads = Json.reads[ResponseWithId]

  def apply(sfRequests: Requests)(sfObjectType: String, fieldName: String, value: String): ClientFailableOp[ResponseWithId] =
    sfRequests.get(s"/services/data/v29.0/sobjects/${sfObjectType}/${fieldName}/${value}")

}
