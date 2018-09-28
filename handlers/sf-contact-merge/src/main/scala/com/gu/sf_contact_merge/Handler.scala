package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.sf_contact_merge.GetSFIdentityIdMoveData.SFContactIdEmailIdentity
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.WireRequestToDomainObject.MergeRequest
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.GetSfContact.SFContact
import com.gu.sf_contact_merge.getsfcontacts.{DedupSfContacts, GetSfAddressOverride, GetSfContact}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.{UpdateAccountSFLinks, UpdateSFContacts, UpdateSalesforceIdentityId}
import com.gu.sf_contact_merge.validate.AssertSame.{Differing, HasAllowableVariations, HasNoVariations}
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
      sfAuth <- SalesforceClient(getResponse, sfConfig).value.toApiGatewayOp("Failed to authenticate with Salesforce")

    } yield Operation.noHealthcheck {
      WireRequestToDomainObject {
        DomainSteps(
          GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier, _),
          AssertSame.emailAddress,
          AssertSame.lastName,
          UpdateSFContacts(UpdateSalesforceIdentityId(sfAuth.wrap(JsonHttp.patch))),
          UpdateAccountSFLinks(requests.put),
          GetSfAddressOverride.apply,
          DedupSfContacts.apply,
          GetSfContact(sfAuth.wrap(JsonHttp.get))
        )
      }
    }
  }

}

object DomainSteps {

  def apply(
    getIdentityAndZuoraEmailsForAccounts: NonEmptyList[AccountId] => ClientFailableOp[List[IdentityAndSFContactAndEmail]],
    validateEmails: AssertSame[EmailAddress],
    validateLastNames: AssertSame[LastName],
    updateSFContacts: UpdateSFContacts,
    updateAccountSFLinks: LinksFromZuora => AccountId => ClientFailableOp[Unit],
    getSfAddressOverride: GetSfAddressOverride,
    dedupSfContacts: DedupSfContacts,
    getSfContact: GetSfContact
  )(mergeRequest: MergeRequest): ResponseModels.ApiResponse =
    (for {
      zuoraAccountAndEmails <- getIdentityAndZuoraEmailsForAccounts(mergeRequest.zuoraAccountIds)
        .toApiGatewayOp("getIdentityAndZuoraEmailsForAccounts")
      _ <- StopIfNoContactsToChange(mergeRequest.sfContactId, zuoraAccountAndEmails.map(_.sfContactId))
      _ <- validateLastNames(zuoraAccountAndEmails.map(_.lastName)) match {
        case Differing(elements) => ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing lastname: $elements"))
        case _ => ContinueProcessing(())
      }
      firstNameToUse <- GetFirstNameToUse(mergeRequest.sfContactId, zuoraAccountAndEmails)
      allSFContactIds = SFContactsForMerge(mergeRequest.sfContactId, zuoraAccountAndEmails.map(_.sfContactId))
      dedupedContactIds = dedupSfContacts.apply(allSFContactIds)
      sfContacts = dedupedContactIds.map(id => getSfContact.apply(id).map(contact => IdWithContact(id, contact)))
      maybeSFAddressOverride <- getSfAddressOverride(sfContacts.map(_.value.map(_.contact.SFMaybeAddress)))
        .toApiGatewayOp("get salesforce addresses")
      _ <- ValidateNoLosingDigitalVoucher(sfContacts.others.map(_.map(_.contact.isDigitalVoucherUser)))
      sss <- toAAA(sfContacts).toApiGatewayOp("get contacts from SF")
      emailOverrides <- validateEmails(sss.map(_.emailIdentity.address)) match {
        case Differing(elements) => ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing emails: $elements"))
        case HasNoVariations(canonical) => ContinueProcessing(ZZZ(canonical, needToOverwriteWith = None))
        case HasAllowableVariations(canonical) => ContinueProcessing(ZZZ(canonical, needToOverwriteWith = Some(canonical)))
      }
      sfIdentityIdMoveData <- GetSFIdentityIdMoveData(emailOverrides.canonicalEmail, sss)
        .toApiGatewayOp(ApiGatewayResponse.notFound _)
      linksFromZuora = LinksFromZuora(mergeRequest.sfContactId, mergeRequest.crmAccountId, sfIdentityIdMoveData.map(_.identityIdUpdate), emailOverrides.needToOverwriteWith)
      _ <- mergeRequest.zuoraAccountIds.traverseU(updateAccountSFLinks(linksFromZuora))
        .toApiGatewayOp("update accounts with winning details")
      _ <- updateSFContacts(mergeRequest.sfContactId, sfIdentityIdMoveData, firstNameToUse, maybeSFAddressOverride, emailOverrides.needToOverwriteWith)
        .toApiGatewayOp("update sf contact(s) to force a sync")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

  def toAAA(sfContacts: SFContactsForMerge[LazyClientFailableOp[IdWithContact]]): ClientFailableOp[List[SFContactIdEmailIdentity]] = {
    val contactsList = NonEmptyList(sfContacts.winner, sfContacts.others: _*)
    val lazyContactsEmailIdentity = contactsList.map(_.map(idWithContact => SFContactIdEmailIdentity(idWithContact.id, idWithContact.contact.emailIdentity)))
    lazyContactsEmailIdentity.traverseU(_.value).map(_.list.toList)
  }

  case class IdWithContact(id: SFContactId, contact: SFContact)

  case class ZZZ(canonicalEmail: EmailAddress, needToOverwriteWith: Option[EmailAddress])

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
