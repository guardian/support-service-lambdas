package com.gu.salesforce.cases

import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.Json

object SalesforceCase extends Logging {

  private val caseBaseUrl = "/services/data/v29.0/sobjects/Case"

  object Raise {

    case class NewCase(
      Origin: String,
      Product__c: String,
      Journey__c: String,
      Enquiry_Type__c: String,
      Status: String,
      Subject: String
    )
    implicit val writes = Json.writes[NewCase]

    case class RaiseCaseResponse(id: String)
    implicit val reads = Json.reads[RaiseCaseResponse]

    def apply(sfRequests: Requests)(newCase: NewCase): ClientFailableOp[RaiseCaseResponse] = {
      sfRequests.post(newCase, caseBaseUrl)
    }

  }

  object Update {

    case class CaseUpdate(
      Journey__c: Option[String] = None,
      Description: Option[String] = None,
      Subject: Option[String] = None,
      Status: Option[String] = None
    )
    implicit val writes = Json.writes[CaseUpdate]

    def apply(sfRequests: Requests)(caseId: String, caseUpdate: CaseUpdate): ClientFailableOp[Unit] = {
      sfRequests.patch(caseUpdate, s"${caseBaseUrl}/${caseId}")
    }

  }

}
