package com.gu.cancellation.sf_cases

import ai.x.play.json.Jsonx
import com.gu.cancellation.sf_cases.Handler.{IdentityId, SfClient}
import com.gu.cancellation.sf_cases.TypeConvert._
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.{FieldName, LookupValue, SfObjectType, TSalesforceGenericIdLookup}
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.Create.WireNewCase
import com.gu.salesforce.cases.SalesforceCase.GetMostRecentCaseByContactId.TGetMostRecentCaseByContactId
import com.gu.salesforce.cases.SalesforceCase.{CaseId, CaseSubject, CaseWithId, ContactId, SubscriptionId}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.{ApiGatewayOp, _}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{JsonHttp, Types}
import play.api.libs.json.{JsObject, JsString, JsValue, Json}

object RaiseCase {

  final case class ProductName(value: String) extends AnyVal
  implicit val formatProductName = Jsonx.formatInline[ProductName]

  final case class Reason(value: String) extends AnyVal
  implicit val formatReason = Jsonx.formatInline[Reason]

  final case class SubscriptionName(value: String) extends AnyVal
  implicit val formatSubscriptionName = Jsonx.formatInline[SubscriptionName]

  final case class GaDataJsonString(value: String) extends AnyVal
  implicit val formatGaDataJsonString = Jsonx.formatInline[GaDataJsonString]

  final case class ContactIdContainer(Id: String)
  implicit val readsContactIdContainer = Json.reads[ContactIdContainer]
  final case class SubscriptionIdContainer(Id: String)
  implicit val readsSubscriptionIdContainer = Json.reads[SubscriptionIdContainer]

  case class RaiseCaseDetail(
    product: ProductName,
    reason: Reason,
    subscriptionName: SubscriptionName,
    gaData: GaDataJsonString
  )
  implicit val readsRaiseCaseDetail = Json.reads[RaiseCaseDetail]
  implicit val writesCaseWithId = Json.writes[CaseWithId]

  val STARTING_CASE_SUBJECT = "Online Cancellation Attempt"

  val buildWireNewCaseForSalesforce = (
    raiseCaseDetail: RaiseCaseDetail,
    sfSubscriptionIdContainer: SubscriptionIdContainer,
    sfContactIdContainer: ContactIdContainer
  ) =>
    WireNewCase(
      ContactId = ContactId(sfContactIdContainer.Id),
      Product__c = raiseCaseDetail.product.value,
      SF_Subscription__c = SubscriptionId(sfSubscriptionIdContainer.Id),
      Journey__c = "SV - At Risk - MB",
      Enquiry_Type__c = raiseCaseDetail.reason.value,
      Case_Closure_Reason__c = raiseCaseDetail.gaData.value,
      Status = "Closed",
      Subject = CaseSubject(STARTING_CASE_SUBJECT)
    )

  def updateCaseReason(
    sfUpdateOp: (CaseId, JsValue) => Types.ClientFailableOp[Unit]
  )(
    reason: Reason,
    sfCase: CaseWithId
  ): ClientFailableOp[Unit] = sfUpdateOp(sfCase.id, JsObject(Map("Enquiry_Type__c" -> JsString(reason.value))))

  type TNewOrResumeCase = (ContactIdContainer, SubscriptionIdContainer, Option[CaseWithId]) => ApiGatewayOp[CaseWithId]

  def raiseCase(
    lookupByIdOp: TSalesforceGenericIdLookup,
    recentCasesOp: TGetMostRecentCaseByContactId,
    newOrResumeCaseOp: TNewOrResumeCase
  )(
    identityId: IdentityId,
    subscriptionName: SubscriptionName
  ): ApiGatewayOp[CaseWithId] =
    for {
      sfContactId <- lookupByIdOp(
        SfObjectType("Contact"),
        FieldName("IdentityID__c"),
        LookupValue(identityId.value)
      ).map(_.Id).map(ContactIdContainer).toApiGatewayOp("lookup SF contact from identityID")
      sfSubscriptionIdContainer <- lookupByIdOp(
        SfObjectType("SF_Subscription__c"),
        FieldName("Name"),
        LookupValue(subscriptionName.value)
      ).map(_.Id).map(SubscriptionIdContainer).toApiGatewayOp("lookup SF subscription ID")
      sfRecentCases <- recentCasesOp(
        ContactId(sfContactId.Id),
        SubscriptionId(sfSubscriptionIdContainer.Id),
        CaseSubject(STARTING_CASE_SUBJECT)
      ).toApiGatewayOp("find most recent case for identity user")
      raiseCaseResponse <- newOrResumeCaseOp(sfContactId, sfSubscriptionIdContainer, sfRecentCases)
    } yield raiseCaseResponse

  type NewCase = (RaiseCaseDetail, SubscriptionIdContainer, ContactIdContainer)

  private def newOrResumeCase(
    createCaseOp: NewCase => ClientFailableOp[CaseWithId],
    updateReasonOnRecentCaseOp: (Reason, CaseWithId) => ClientFailableOp[Unit],
    raiseCaseDetail: RaiseCaseDetail
  )(
    sfContactIdContainer: ContactIdContainer,
    sfSubscriptionIdContainer: SubscriptionIdContainer,
    sfRecentCase: Option[CaseWithId]
  ) = sfRecentCase match {
    // recent case exists, so just update the reason and return the case
    case Some(recentCase) => for {
      _ <- updateReasonOnRecentCaseOp(raiseCaseDetail.reason, recentCase)
        .toApiGatewayOp("update reason of recent sf case")
    } yield recentCase
    // no recent cases so create one
    case None => createCaseOp((raiseCaseDetail, sfSubscriptionIdContainer, sfContactIdContainer))
      .toApiGatewayOp("create sf case")
  }

  def steps(sfClient: SfClient)(apiGatewayRequest: ApiGatewayRequest, identityId: IdentityId) =
    (for {
      raiseCaseDetail <- apiGatewayRequest.bodyAsCaseClass[RaiseCaseDetail]()
      lookupByIdOp = SalesforceGenericIdLookup(sfClient.wrapWith(JsonHttp.get))
      mostRecentCaseOp = SalesforceCase.GetMostRecentCaseByContactId(sfClient.wrapWith(JsonHttp.get))
      createCaseOp = SalesforceCase.Create(sfClient.wrapWith(JsonHttp.post))
      wiredCreateCaseOp = buildWireNewCaseForSalesforce.tupled andThen createCaseOp
      sfUpdateOp = SalesforceCase.Update(sfClient.wrapWith(JsonHttp.patch))
      updateReasonOnRecentCaseOp = updateCaseReason(sfUpdateOp)_
      newOrResumeCaseOp = newOrResumeCase(wiredCreateCaseOp, updateReasonOnRecentCaseOp, raiseCaseDetail)_
      wiredRaiseCase = raiseCase(lookupByIdOp, mostRecentCaseOp, newOrResumeCaseOp)_
      raiseCaseResponse <- wiredRaiseCase(identityId, raiseCaseDetail.subscriptionName)
    } yield ApiGatewayResponse("200", raiseCaseResponse)).apiResponse
}
