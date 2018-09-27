package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.WireRequestToDomainObject.MergeRequest
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.{DedupSfContacts, GetSfAddress, GetSfAddressOverride}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.UpdateSFContacts.OldSFContact
import com.gu.sf_contact_merge.update.{UpdateAccountSFLinks, UpdateSFContacts, UpdateSalesforceIdentityId}
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
      sfAuth <- SalesforceClient(getResponse, sfConfig).value.toApiGatewayOp("Failed to authenticate with Salesforce")

    } yield Operation.noHealthcheck {
      WireRequestToDomainObject {
        DomainSteps(
          GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier, _),
          AssertSame.emailAddress,
          AssertSame.lastName,
          EnsureNoAccountWithWrongIdentityId.apply,
          UpdateSFContacts(UpdateSalesforceIdentityId(sfAuth.wrap(JsonHttp.patch))),
          UpdateAccountSFLinks(requests.put),
          GetSfAddressOverride.apply,
          DedupSfContacts.apply,
          GetSfAddress(sfAuth.wrap(JsonHttp.get))
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
    dedupSfContacts: DedupSfContacts,
    getSfAddress: GetSfAddress
  )(mergeRequest: MergeRequest): ResponseModels.ApiResponse =
    (for {
      accountAndEmails <- getIdentityAndZuoraEmailsForAccounts(mergeRequest.zuoraAccountIds)
        .toApiGatewayOp("getIdentityAndZuoraEmailsForAccounts")
      _ <- AnyContactsToChange(mergeRequest.sfContactId, accountAndEmails.map(_.sfContactId))
      _ <- validateEmails(accountAndEmails.map(_.emailAddress))
      maybeIdentityId <- validateIdentityIds(accountAndEmails.map(_.identityId))
        .toApiGatewayOp(ApiGatewayResponse.notFound _)
      _ <- validateLastNames(accountAndEmails.map(_.lastName))
      firstNameToUse <- GetFirstNameToUse(mergeRequest.sfContactId, accountAndEmails)
      rawSFContactIds = SFContactsForMerge(mergeRequest.sfContactId, accountAndEmails.map(_.sfContactId))
      winningAndOtherContact = dedupSfContacts.apply(rawSFContactIds).map(getSfAddress.apply)
      maybeSFAddressOverride <- getSfAddressOverride(winningAndOtherContact.map(_.map(_.SFMaybeAddress)))
        .toApiGatewayOp("get salesforce addresses")
      _ <- ValidateNoLosingDigitalVoucher(winningAndOtherContact.others.map(_.map(_.isDigitalVoucherUser)))
      oldContact = accountAndEmails.find(_.identityId.isDefined).map(_.sfContactId).map(OldSFContact.apply)
      linksFromZuora = LinksFromZuora(mergeRequest.sfContactId, mergeRequest.crmAccountId, maybeIdentityId)
      _ <- mergeRequest.zuoraAccountIds.traverseU(updateAccountSFLinks(linksFromZuora))
        .toApiGatewayOp("update accounts with winning details")
      _ <- updateSFContacts(mergeRequest.sfContactId, maybeIdentityId, oldContact, firstNameToUse, maybeSFAddressOverride, None /*TODO*/ )
        // TODO next pr will fill in the None above with the non "+gnm" email address, if the winner is a +gnm.
        .toApiGatewayOp("update sf contact(s) to force a sync")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
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
