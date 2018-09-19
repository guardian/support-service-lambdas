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
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName, LastName}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.IsDigitalVoucherUser
import com.gu.sf_contact_merge.getsfcontacts.{GetSfAddress, GetSfAddressOverride, GetSfContacts}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.UpdateSFContacts.OldSFContact
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.IdentityId
import com.gu.sf_contact_merge.update.{UpdateAccountSFLinks, UpdateSFContacts, UpdateSalesforceIdentityId}
import com.gu.sf_contact_merge.validate._
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.LazyClientFailableOp
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
      sfAuth <- SalesforceAuthenticate.doAuth(getResponse, sfConfig)
      sfPatch = SalesforceAuthenticate.patch(getResponse, sfAuth)
      sfGet = SalesforceAuthenticate.get(getResponse, sfAuth)

    } yield Operation.noHealthcheck {
      WireRequestToDomainObject {
        DomainSteps(
          GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier, _),
          AssertSame.emailAddress,
          AssertSame.lastName,
          EnsureNoAccountWithWrongIdentityId.apply,
          UpdateSFContacts(UpdateSalesforceIdentityId(sfPatch)),
          UpdateAccountSFLinks(requests.put),
          GetSfAddressOverride.apply,
          GetSfContacts(GetSfAddress(sfGet))
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
    updateSFContacts: UpdateSFContacts,
    updateAccountSFLinks: LinksFromZuora => AccountId => ClientFailableOp[Unit],
    getSfAddressOverride: GetSfAddressOverride,
    getSfContacts: GetSfContacts
  )(mergeRequest: MergeRequest): ResponseModels.ApiResponse =
    (for {
      accountAndEmails <- getIdentityAndZuoraEmailsForAccounts(mergeRequest.zuoraAccountIds)
        .toApiGatewayOp("getIdentityAndZuoraEmailsForAccounts")
      _ <- validateEmails(accountAndEmails.map(_.emailAddress))
      maybeIdentityId <- validateIdentityIds(accountAndEmails.map(_.identityId))
        .toApiGatewayOp(ApiGatewayResponse.notFound _)
      _ <- validateLastNames(accountAndEmails.map(_.lastName))
      firstNameToUse <- GetFirstNameToUse(mergeRequest.sfContactId, accountAndEmails)
      winningContact = getSfContacts.apply(mergeRequest.sfContactId, accountAndEmails.map(_.sfContactId))
      maybeSFAddressOverride <- getSfAddressOverride(winningContact.winner.map(_.SFMaybeAddress), winningContact.others.map(_.map(_.SFMaybeAddress)))
        .toApiGatewayOp("get salesforce addresses")
      _ <- ValidateNoLosingDigitalVoucher(winningContact.others.map(_.map(_.isDigitalVoucherUser)))
      oldContact = accountAndEmails.find(_.identityId.isDefined).map(_.sfContactId).map(OldSFContact.apply)
      linksFromZuora = LinksFromZuora(mergeRequest.sfContactId, mergeRequest.crmAccountId, maybeIdentityId)
      _ <- mergeRequest.zuoraAccountIds.traverseU(updateAccountSFLinks(linksFromZuora))
        .toApiGatewayOp("update accounts with winning details")
      _ <- updateSFContacts(mergeRequest.sfContactId, maybeIdentityId, oldContact, firstNameToUse, maybeSFAddressOverride)
        .toApiGatewayOp("update sf contact(s) to force a sync")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
}

object ValidateNoLosingDigitalVoucher {

  def apply(losingContacts: List[LazyClientFailableOp[GetSfAddress.IsDigitalVoucherUser]]): ApiGatewayOp[Unit] =
    losingContacts.toStream.map {
      _.value.toApiGatewayOp("get SF address").flatMap {
        case IsDigitalVoucherUser(true) => ReturnWithResponse(ApiGatewayResponse.notFound("failed validation due to a "))
        case IsDigitalVoucherUser(false) => ContinueProcessing(())
      }
    }.find(_.isComplete).getOrElse(ContinueProcessing(()))

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
    accountId: String
  )
  case class MergeRequest(
    sfContactId: SFContactId,
    crmAccountId: CRMAccountId,
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
        SFContactId(request.fullContactId),
        CRMAccountId(request.accountId),
        accountIds
      )
    }

}
