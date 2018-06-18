package com.gu.salesforce.cases

import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.Json

object SalesforceCase extends Logging {

  private val caseBaseUrl = "/services/data/v29.0/sobjects/Case"

  private case class NewCase(Product__c: String)
  private implicit val writes = Json.writes[NewCase]

  case class CaseResponse(id: String)
  implicit val reads = Json.reads[CaseResponse]

  object Raise {
    def apply(sfRequests: Requests)(): ClientFailableOp[CaseResponse] = {
      sfRequests.post(NewCase("Membership"), caseBaseUrl)
    }
  }
  //
  //  object Update {
  //    def apply(sfRequests: Requests)(caseId: String): ClientFailableOp[CaseResponse] = {
  //      sfRequests.post(UpdateCase(), s"${caseBaseUrl}/${caseId}")
  //    }
  //  }

}
