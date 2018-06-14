package com.gu.salesforce.cases

import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.Json

object SalesforceCase extends Logging {

  private val caseBaseUrl = "/services/data/v29.0/sobjects/Case/"

  private case class NewCase(IdentityID__c: String)
  private implicit val writes = Json.writes[NewCase]

  case class CaseResponse(CaseId: String)
  implicit val reads = Json.reads[CaseResponse]

  object Raise {
    def apply(sfRequests: Requests)(identityId: String): ClientFailableOp[CaseResponse] = {
      sfRequests.post(NewCase(identityId), caseBaseUrl)
    }
  }

  object Update {
    def apply(sfRequests: Requests)(identityId: String, caseId: String): ClientFailableOp[CaseResponse] = {
      sfRequests.post(NewCase(identityId), s"${caseBaseUrl}${caseId}")
    }
  }

}
