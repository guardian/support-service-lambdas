package com.gu.salesforce.cases

import com.gu.cancellation.sf_cases.RaiseCase.SubscriptionName
import com.gu.salesforce.SalesforceConstants._
import com.gu.util.Logging
import com.gu.util.resthttp.RestOp._
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import play.api.libs.json.{JsValue, Json, Reads}

object SalesforceCase extends Logging {

  private val CASE_ORIGIN = "Self Service"

  private val caseSObjectsBaseUrl = sfObjectsBaseUrl + "Case"

  case class CaseId(value: String) extends AnyVal
  implicit val formatCaseId = Json.valueFormat[CaseId]

  case class CaseWithId(id: CaseId)
  implicit val caseWithIdReads = Json.reads[CaseWithId]

  case class ContactId(value: String) extends AnyVal
  implicit val formatContactId = Json.valueFormat[ContactId]

  case class SubscriptionId(value: String) extends AnyVal
  implicit val formatSubscriptionId = Json.valueFormat[SubscriptionId]

  case class CaseSubject(value: String) extends AnyVal
  implicit val formatCaseSubject = Json.valueFormat[CaseSubject]

  object Create {

    // NOTE : Case Owner is set by SF Rule based on Origin='Self Service'
    case class WireNewCase(
        Subscription_Name__c: SubscriptionName,
        ContactId: ContactId,
        Product__c: String,
        Journey__c: String,
        Enquiry_Type__c: String,
        Case_Closure_Reason__c: String,
        Status: String,
        Subject: CaseSubject,
        Origin: String = CASE_ORIGIN,
    )
    implicit val writesWireNewCase = Json.writes[WireNewCase]

    def apply(post: HttpOp[RestRequestMaker.PostRequest, JsValue]): WireNewCase => ClientFailableOp[CaseWithId] =
      post
        .setupRequest[WireNewCase] { newCase =>
          PostRequest(newCase, RelativePath(caseSObjectsBaseUrl))
        }
        .parse[CaseWithId]
        .runRequest

  }

  object Update {

    def apply(patch: HttpOp[RestRequestMaker.PatchRequest, Unit]): (CaseId, JsValue) => ClientFailableOp[Unit] =
      patch.setupRequestMultiArg(toRequest _).runRequestMultiArg

    def toRequest(caseId: CaseId, body: JsValue): PatchRequest =
      PatchRequest(body, RelativePath(s"$caseSObjectsBaseUrl/${caseId.value}"))

  }

  object GetById {

    def apply[ResponseType: Reads](
        get: HttpOp[RestRequestMaker.GetRequest, JsValue],
    ): CaseId => ClientFailableOp[ResponseType] =
      get.setupRequest(toRequest).parse[ResponseType].runRequest

    def toRequest(caseId: CaseId): GetRequest =
      RestRequestMaker.GetRequest(RelativePath(s"$caseSObjectsBaseUrl/${caseId.value}"))

  }

  object GetMostRecentCaseByContactId {

    private case class CaseWithCamelcaseId(Id: String)
    private implicit val readsCaseWithCamelcaseId = Json.reads[CaseWithCamelcaseId]

    private case class CaseQueryResponse(records: List[CaseWithCamelcaseId])
    private implicit val readsCases = Json.reads[CaseQueryResponse]

    type TGetMostRecentCaseByContactId =
      (ContactId, SubscriptionName, CaseSubject) => ClientFailableOp[Option[CaseWithId]]

    def apply(
        get: HttpOp[RestRequestMaker.GetRequest, JsValue],
    ): (ContactId, SubscriptionName, CaseSubject) => ClientFailableOp[Option[CaseWithId]] =
      get.setupRequestMultiArg(toRequest _).parse[CaseQueryResponse].map(toResponse).runRequestMultiArg

    def toRequest(
        contactId: ContactId,
        subscriptionName: SubscriptionName,
        caseSubject: CaseSubject,
    ): GetRequest = {
      val soqlQuery = s"SELECT Id " +
        s"FROM Case " +
        s"WHERE ContactId = '${contactId.value}' " +
        s"AND Origin = '$CASE_ORIGIN' " +
        s"AND CreatedDate = LAST_N_DAYS:3 " +
        s"AND Subscription_Name__c = '${subscriptionName.value}' " +
        s"AND Subject = '${caseSubject.value}' " +
        s"ORDER BY CreatedDate DESC " +
        s"LIMIT 1"
      logger.info(s"using SF query : $soqlQuery")
      RestRequestMaker.GetRequest(RelativePath(s"$soqlQueryBaseUrl?q=$soqlQuery"))
    }

    def toResponse(caseQueryResponse: CaseQueryResponse): Option[CaseWithId] = {
      caseQueryResponse.records.headOption.map(camelId => CaseWithId(CaseId(camelId.Id)))
    }

  }

}
