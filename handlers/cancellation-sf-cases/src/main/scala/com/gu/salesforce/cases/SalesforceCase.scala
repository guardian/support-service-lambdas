package com.gu.salesforce.cases

import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.{JsValue, Json}

object SalesforceCase extends Logging {

  private val caseBaseUrl = "/services/data/v29.0/sobjects/Case"

  object Raise {

    case class NewCase(
//      Owner: String, //TODO new queue
      Subscription_Name__c: String,
//      Contact: String, //TODO new lookup based on identityID
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

    def apply(sfRequests: Requests)(newCase: NewCase): ClientFailableOp[RaiseCaseResponse] =
      sfRequests.post(newCase, caseBaseUrl)

  }

  object Update {

    def apply(sfRequests: Requests)(caseId: String, body: JsValue): ClientFailableOp[Unit] =
      sfRequests.patch(body, s"${caseBaseUrl}/${caseId}")

  }

}
