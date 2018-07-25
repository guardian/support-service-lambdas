package com.gu.salesforce.cases

import com.gu.util.Logging
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsValue, Json, Reads}

object SalesforceCase extends Logging {

  private val caseBaseUrl = "/services/data/v29.0"
  private val caseSObjectsBaseUrl = caseBaseUrl + "/sobjects/Case"
  private val caseSoqlQueryBaseUrl = caseBaseUrl + "/query/?q="

  case class CaseWithId(Id: String)
  implicit val caseWithIdReads = Json.reads[CaseWithId]

  object Raise {

    type RaiseCase = NewCase => ClientFailableOp[CaseWithId]

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

    def apply(sfRequests: Requests)(newCase: NewCase): ClientFailableOp[CaseWithId] =
      sfRequests.post(newCase, caseSObjectsBaseUrl)

  }

  object Update {

    def apply(sfRequests: Requests)(caseId: String, body: JsValue): ClientFailableOp[Unit] =
      sfRequests.patch(body, s"$caseSObjectsBaseUrl/$caseId")

  }

  object GetById {

    def apply[ResponseType](sfRequests: Requests)(caseId: String)(implicit ev1: Reads[ResponseType]): ClientFailableOp[ResponseType] =
      sfRequests.get[ResponseType](s"$caseSObjectsBaseUrl/$caseId")
  }

  object GetMostRecentCaseByContactId {

    case class GetMostRecentCaseByContactIdParams(
      contactId: String,
      caseOrigin: String,
      subscriptionId: String,
      caseSubject: String,
      limit: Int = 1
    )
    type TGetMostRecentCaseByContactId = GetMostRecentCaseByContactIdParams => ClientFailableOp[RecentCases]

    case class RecentCases(records: List[CaseWithId])
    implicit val readsCases = Json.reads[RecentCases]

    def apply(sfRequests: Requests)(params: GetMostRecentCaseByContactIdParams): ClientFailableOp[RecentCases] = {
      val soqlQuery = s"SELECT Id " +
          s"FROM Case " +
          s"WHERE ContactId = '${params.contactId}' " +
          s"AND Origin = '${params.caseOrigin}' " +
          s"AND CreatedDate = LAST_N_DAYS:3 " +
          s"AND SF_Subscription__c = '${params.subscriptionId}' " +
          s"AND Subject = '${params.caseSubject}' " +
          s"ORDER BY CreatedDate DESC " +
          s"LIMIT ${params.limit}"
      logger.info(soqlQuery)
      sfRequests.get[RecentCases](s"$caseSoqlQueryBaseUrl$soqlQuery")
    }
  }

}
