package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.WireRequestToDomainObject.MergeRequest
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName, LastName}
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.update.MoveIdentityId.OldSFContact
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import com.gu.sf_contact_merge.update.{MoveIdentityId, UpdateAccountSFLinks, UpdateSalesforceIdentityId}
import com.gu.sf_contact_merge.validate._
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.MaybeNonEmptyList
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import scalaz.NonEmptyList
import scalaz.syntax.traverse.ToTraverseOps

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      operationForEffects(RawEffects.stage, GetFromS3.fetchString, RawEffects.response)
    }

  def operationForEffects(stage: Stage, fetchString: StringFromS3, getResponse: Request => Response): ApiGatewayOp[Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    for {

      zuoraRestConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load trusted Api config")
      requests = ZuoraRestRequestMaker(getResponse, zuoraRestConfig)
      zuoraQuerier = ZuoraQuery(requests)

      sfConfig <- loadConfig[SFAuthConfig].toApiGatewayOp("load trusted Api config")
      sfPatch <- SalesforceAuthenticate.patch(getResponse, sfConfig)

    } yield Operation.noHealthcheck {
      WireRequestToDomainObject {
        DomainSteps(
          GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier, _),
          AssertSame[Option[EmailAddress]]("emails"),
          AssertSame[LastName]("last names"),
          EnsureNoAccountWithWrongIdentityId.apply,
          MoveIdentityId(
            UpdateSalesforceIdentityId(sfPatch).runRequestMultiArg
          ),
          UpdateAccountSFLinks(requests.put)
        )
      }
    }
  }

}

object DomainSteps {

  def apply(
    getIdentityAndZuoraEmailsForAccounts: NonEmptyList[AccountId] => ClientFailableOp[List[IdentityAndSFContactAndEmail]],
    validateEmails: AssertSame[Option[EmailAddress]],
    validateLastNames: AssertSame[LastName],
    validateIdentityIds: EnsureNoAccountWithWrongIdentityId,
    update: MoveIdentityId,
    updateAccountSFLinks: LinksFromZuora => AccountId => ClientFailableOp[Unit]
  )(mergeRequest: MergeRequest): ResponseModels.ApiResponse =
    (for {
      accountAndEmails <- getIdentityAndZuoraEmailsForAccounts(mergeRequest.zuoraAccountIds)
        .toApiGatewayOp("getIdentityAndZuoraEmailsForAccounts")
      _ <- validateEmails(accountAndEmails.map(_.emailAddress))
      _ <- validateIdentityIds(accountAndEmails.map(_.identityId), mergeRequest.sFPointer.identityId)
        .toApiGatewayReturnResponse(ApiGatewayResponse.notFound)
      _ <- validateLastNames(accountAndEmails.map(_.lastName))
      firstNameToUse <- GetFirstNameToUse(mergeRequest.sFPointer.sfContactId, accountAndEmails)
      oldContact = accountAndEmails.find(_.identityId.isDefined).map(_.sfContactId).map(OldSFContact.apply)
      _ <- mergeRequest.zuoraAccountIds.traverseU(updateAccountSFLinks(mergeRequest.sFPointer))
        .toApiGatewayOp("update accounts with winning details")
      _ <- update(mergeRequest.sFPointer, oldContact, firstNameToUse)
        .toApiGatewayOp("update sf contact(s) to force a sync")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
}

object GetFirstNameToUse {

  case class NameForIdentityId(identityId: Option[IdentityId], firstName: Option[FirstName])
  def firstNameForIdentityAccount(namesForIdentityIds: List[NameForIdentityId]): Option[FirstName] = {
    namesForIdentityIds.find(_.identityId.isDefined).flatMap(_.firstName)
  }

  case class NameForContactId(sfContactId: SFContactId, firstName: Option[FirstName])
  def firstNameForSFContact(newSFContactId: SFContactId, namesForContactIds: List[NameForContactId]): ApiGatewayOp[Option[FirstName]] = {
    namesForContactIds.find(_.sfContactId == newSFContactId)
      .toApiGatewayContinueProcessing(ApiGatewayResponse.notFound("winning contact id wasn't in any zuora account"))
      .map(_.firstName)
  }

  def apply(sfContactId: SFContactId, accountAndEmails: List[IdentityAndSFContactAndEmail]): ApiGatewayOp[Option[FirstName]] = {
    val nameForIdentityIds = accountAndEmails.map { info => NameForIdentityId(info.identityId, info.firstName) }
    val maybeIdentityFirstName = firstNameForIdentityAccount(nameForIdentityIds)
    val nameForContactIds = accountAndEmails.map { info => NameForContactId(info.sfContactId, info.firstName) }
    firstNameForSFContact(sfContactId, nameForContactIds).map { maybeOldFirstName =>
      maybeOldFirstName orElse maybeIdentityFirstName
    }
  }

}

object WireRequestToDomainObject {

  implicit val readWireSfContactRequest = Json.reads[WireSfContactRequest]

  case class WireSfContactRequest(
    fullContactId: String,
    billingAccountZuoraIds: List[String],
    accountId: String,
    identityId: Option[String]
  )
  case class MergeRequest(
    sFPointer: LinksFromZuora,
    zuoraAccountIds: NonEmptyList[AccountId]
  )

  def apply(
    steps: MergeRequest => ResponseModels.ApiResponse
  ): ApiGatewayRequest => ResponseModels.ApiResponse = req =>
    (for {
      wireInput <- req.bodyAsCaseClass[WireSfContactRequest]()
      mergeRequest <- toMergeRequest(wireInput)
        .toApiGatewayContinueProcessing(ApiGatewayResponse.badRequest("no account ids supplied"))
    } yield steps(mergeRequest)).apiResponse

  def toMergeRequest(request: WireSfContactRequest): Option[MergeRequest] =
    MaybeNonEmptyList(request.billingAccountZuoraIds.map(AccountId.apply)).map { accountIds =>
      MergeRequest(
        LinksFromZuora(
          SFContactId(request.fullContactId),
          CRMAccountId(request.accountId),
          request.identityId.map(IdentityId.apply)
        ),
        accountIds
      )
    }

}
