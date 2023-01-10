package com.gu.cancellation.sf_cases

import com.gu.cancellation.sf_cases.Handler.{IdentityId, SfClient}
import com.gu.cancellation.sf_cases.TypeConvert._
import com.gu.salesforce.SalesforceGenericIdLookup
import com.gu.salesforce.SalesforceGenericIdLookup.{FieldName, LookupValue, SfObjectType, TSalesforceGenericIdLookup}
import com.gu.salesforce.cases.SalesforceCase
import com.gu.salesforce.cases.SalesforceCase.{CaseId, ContactId}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsValue, Json, Reads}

object UpdateCase {

  case class CaseWithContactId(ContactId: ContactId)
  implicit val caseReads: Reads[CaseWithContactId] = Json.reads[CaseWithContactId]

  def verifyCaseBelongsToUser(
      lookupByIdOp: TSalesforceGenericIdLookup,
      getCaseByIdOp: CaseId => ClientFailableOp[CaseWithContactId],
  )(
      identityId: IdentityId,
      caseId: CaseId,
  ) =
    for {
      sfContactIdFromIdentity <- lookupByIdOp(
        SfObjectType("Contact"),
        FieldName("IdentityID__c"),
        LookupValue(identityId.value),
      ).toApiGatewayOp("lookup SF contact ID from identityID")
      caseWithContactId <- getCaseByIdOp(caseId).toApiGatewayOp("lookup ContactId from SF Case")
      _ <- (sfContactIdFromIdentity.Id equals caseWithContactId.ContactId.value)
        .toApiGatewayContinueProcessing(
          ApiGatewayResponse.forbidden(
            s"Authenticated user (${sfContactIdFromIdentity.Id}) does not match ContactId ($caseWithContactId) for Case ($caseId)",
          ),
        )
    } yield ()

  def steps(sfClient: SfClient)(apiGatewayRequest: ApiGatewayRequest, identityId: IdentityId) =
    (for {
      caseId <- apiGatewayRequest.path.map(_.split("/").last).map(CaseId).toApiGatewayOp("extract caseId from path")
      lookupByIdOp = SalesforceGenericIdLookup(sfClient.wrapWith(JsonHttp.get))
      getCaseByIdOp = SalesforceCase.GetById[CaseWithContactId](sfClient.wrapWith(JsonHttp.get)) _
      _ <- verifyCaseBelongsToUser(lookupByIdOp, getCaseByIdOp)(identityId, caseId)
      requestBody <- apiGatewayRequest.bodyAsCaseClass[JsValue]()
      sfUpdateOp = SalesforceCase.Update(sfClient.wrapWith(JsonHttp.patch))
      _ <- sfUpdateOp(caseId, requestBody).toApiGatewayOp("update case")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}
