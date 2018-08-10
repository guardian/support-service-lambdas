package com.gu.salesforce.cases

import ai.x.play.json.Jsonx
import com.gu.util.Logging
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsValue, Json, Reads}

object SalesforceCase extends Logging {

  private val CASE_ORIGIN = "Self Service"

  private val caseBaseUrl = "/services/data/v29.0"
  private val caseSObjectsBaseUrl = caseBaseUrl + "/sobjects/Case"
  private val caseSoqlQueryBaseUrl = caseBaseUrl + "/query/?q="

  case class CaseId(value: String) extends AnyVal
  implicit val formatCaseId = Jsonx.formatInline[CaseId]

  case class CaseWithId(id: CaseId)
  implicit val caseWithIdReads = Json.reads[CaseWithId]

  case class ContactId(value: String) extends AnyVal
  implicit val formatContactId = Jsonx.formatInline[ContactId]

  case class SubscriptionId(value: String) extends AnyVal
  implicit val formatSubscriptionId = Jsonx.formatInline[SubscriptionId]

  case class CaseSubject(value: String) extends AnyVal
  implicit val formatCaseSubject = Jsonx.formatInline[CaseSubject]

  object Create {

    // NOTE : Case Owner is set by SF Rule based on Origin='Self Service'
    case class WireNewCase(
      SF_Subscription__c: SubscriptionId,
      ContactId: ContactId,
      Product__c: String,
      Journey__c: String,
      Enquiry_Type__c: String,
      Case_Closure_Reason__c: String,
      Status: String,
      Subject: CaseSubject,
      Origin: String = CASE_ORIGIN
    )
    implicit val writesWireNewCase = Json.writes[WireNewCase]

    def apply(sfRequests: Requests)(newCase: WireNewCase): ClientFailableOp[CaseWithId] =
      sfRequests.post[WireNewCase, CaseWithId](newCase, caseSObjectsBaseUrl)

  }

  object Update {

    def apply(sfRequests: Requests)(caseId: CaseId, body: JsValue): ClientFailableOp[Unit] =
      sfRequests.patch(body, s"$caseSObjectsBaseUrl/${caseId.value}")

  }

  object GetById {

    def apply[ResponseType: Reads](sfRequests: Requests)(caseId: CaseId): ClientFailableOp[ResponseType] =
      sfRequests.get[ResponseType](s"$caseSObjectsBaseUrl/${caseId.value}")
  }

  object GetMostRecentCaseByContactId {

    private case class CaseWithCamelcaseId(Id: String)
    private implicit val readsCaseWithCamelcaseId = Json.reads[CaseWithCamelcaseId]

    private case class CaseQueryResponse(records: List[CaseWithCamelcaseId])
    private implicit val readsCases = Json.reads[CaseQueryResponse]

    type TGetMostRecentCaseByContactId = (ContactId, SubscriptionId, CaseSubject) => ClientFailableOp[Option[CaseWithId]]

    def apply(
      sfRequests: Requests
    )(
      contactId: ContactId,
      subscriptionId: SubscriptionId,
      caseSubject: CaseSubject
    ): ClientFailableOp[Option[CaseWithId]] = {
      val soqlQuery = s"SELECT Id " +
        s"FROM Case " +
        s"WHERE ContactId = '${contactId.value}' " +
        s"AND Origin = '$CASE_ORIGIN' " +
        s"AND CreatedDate = LAST_N_DAYS:3 " +
        s"AND SF_Subscription__c = '${subscriptionId.value}' " +
        s"AND Subject = '${caseSubject.value}' " +
        s"ORDER BY CreatedDate DESC " +
        s"LIMIT 1"
      logger.info(s"using SF query : $soqlQuery")
      sfRequests.get[CaseQueryResponse](s"$caseSoqlQueryBaseUrl$soqlQuery")
        .map(_.records.headOption.map(camelId => CaseWithId(CaseId(camelId.Id))))
    }
  }

}
