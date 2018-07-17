package com.gu.salesforce.cases

import com.gu.util.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.{JsValue, Json, Reads}

object SalesforceCase extends Logging {

  private val caseBaseUrl = "/services/data/v29.0/sobjects/Case"

  object Raise {

    type RaiseCase = NewCase => ClientFailableOp[RaiseCaseResponse]

    // NOTE : Case Owner is set by SF Rule based on Origin='Self Service'
    case class NewCase(
      SF_Subscription__c: String,
      ContactId: String,
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

  object GetById {

    def apply[ResponseType](sfRequests: Requests)(caseId: String)(implicit ev1: Reads[ResponseType]): ClientFailableOp[ResponseType] =
      sfRequests.get(s"${caseBaseUrl}/${caseId}")
  }

}
