package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.sf_contact_merge.GetSFIdentityIdMoveData.{CanonicalEmail, SFContactIdEmailIdentity}
import com.gu.sf_contact_merge.SFSteps.SFData
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.WireRequestToDomainObject.MergeRequest
import com.gu.sf_contact_merge.ZuoraSteps.ZuoraData
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.sf_contact_merge.getaccounts.{GetIdentityAndZuoraEmailsForAccountsSteps, GetZuoraContactDetails}
import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.GetSfContact.SFContact
import com.gu.sf_contact_merge.getsfcontacts.{DedupSfContacts, GetSfAddressOverride, GetSfContact}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, ZuoraFieldUpdates}
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
          ZuoraSteps(
            GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier),
            AssertSame.lastName
          ),
          UpdateSFContacts(UpdateSalesforceIdentityId(sfAuth.wrap(JsonHttp.patch))),
          UpdateAccountSFLinks(requests.put),
          SFSteps(
            AssertSame.emailAddress,
            GetSfAddressOverride.apply,
            GetSfContact(sfAuth.wrap(JsonHttp.get))
          )
        )
      }
    }
  }

}

object DomainSteps {

  def apply(
    zuoraSteps: ZuoraSteps,
    updateSFContacts: UpdateSFContacts,
    updateAccountSFLinks: UpdateAccountSFLinks,
    sfSteps: SFSteps
  )(mergeRequest: MergeRequest): ResponseModels.ApiResponse =
    (for {
      zuoraData <- zuoraSteps.apply(mergeRequest)

      sfData <- sfSteps.apply(zuoraData.dedupedContactIds)

      _ <- {
        val linksFromZuora = ZuoraFieldUpdates(
          mergeRequest.winningSFContact,
          mergeRequest.crmAccountId,
          sfData.sfIdentityIdMoveData.map(_.identityIdUpdate),
          sfData.emailOverrides.needToOverwriteWith
        )
        mergeRequest.zuoraAccountIds.traverseU(updateAccountSFLinks(linksFromZuora, _))
      }.toApiGatewayOp("update accounts with winning details")
      _ <- updateSFContacts(
        mergeRequest.winningSFContact,
        sfData.sfIdentityIdMoveData,
        zuoraData.firstNameToUse,
        sfData.maybeSFAddressOverride,
        sfData.emailOverrides.needToOverwriteWith
      ).toApiGatewayOp("update sf contact(s) to force a sync")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}

object SFSteps {
  def apply(
    validateEmails: AssertSame[EmailAddress],
    getSfAddressOverride: GetSfAddressOverride,
    getSfContact: GetSfContact
  ): SFSteps = { dedupedContactIds =>
    val sfContacts = dedupedContactIds.map(id => getSfContact.apply(id).map(contact => IdWithContact(id, contact)))
    for {
      maybeSFAddressOverride <- getSfAddressOverride(sfContacts.map(_.value.map(_.contact.SFMaybeAddress)))
        .toApiGatewayOp("get salesforce addresses")
      _ <- ValidateNoLosingDigitalVoucher(sfContacts.others.map(_.map(_.contact.isDigitalVoucherUser)))
      contacts <- flattenContactData(sfContacts).toApiGatewayOp("get contacts from SF")
      emailOverrides <- validateEmails(contacts.map(_.emailIdentity.address)) match {
        case Differing(elements) =>
          ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing emails: $elements"))
        case HasNoVariations(canonical) =>
          ContinueProcessing(CanonicalEmailAndOverwriteEmail(CanonicalEmail(canonical), needToOverwriteWith = None))
        case HasAllowableVariations(canonical) =>
          ContinueProcessing(CanonicalEmailAndOverwriteEmail(CanonicalEmail(canonical), needToOverwriteWith = Some(canonical)))
      }
      sfIdentityIdMoveData <- GetSFIdentityIdMoveData(emailOverrides.canonicalEmail, contacts)
        .toApiGatewayOp(ApiGatewayResponse.notFound _)
    } yield SFData(sfIdentityIdMoveData, emailOverrides, maybeSFAddressOverride)
  }

  def flattenContactData(sfContacts: SFContactsForMerge[LazyClientFailableOp[IdWithContact]]): ClientFailableOp[List[SFContactIdEmailIdentity]] = {
    val contactsList = NonEmptyList(sfContacts.winner, sfContacts.others: _*)
    val lazyContactsEmailIdentity = contactsList.map(_.map(idWithContact =>
      SFContactIdEmailIdentity(idWithContact.id, idWithContact.contact.emailIdentity)))
    lazyContactsEmailIdentity.traverseU(_.value).map(_.list.toList)
  }

  case class IdWithContact(id: SFContactId, contact: SFContact)

  case class CanonicalEmailAndOverwriteEmail(canonicalEmail: CanonicalEmail, needToOverwriteWith: Option[EmailAddress])

  case class SFData(
    sfIdentityIdMoveData: Option[UpdateSFContacts.IdentityIdMoveData],
    emailOverrides: CanonicalEmailAndOverwriteEmail,
    maybeSFAddressOverride: GetSfAddressOverride.SFAddressOverride
  )

}
trait SFSteps {
  def apply(dedupedContactIds: SFContactsForMerge[SFContactId]): ApiGatewayOp[SFData]

}

object ZuoraSteps {

  def apply(
    getIdentityAndZuoraEmailsForAccounts: GetIdentityAndZuoraEmailsForAccountsSteps,
    validateLastNames: AssertSame[LastName]
  ): ZuoraSteps = { mergeRequest =>
    for {
      zuoraAccountAndEmails <- getIdentityAndZuoraEmailsForAccounts(mergeRequest.zuoraAccountIds)
        .toApiGatewayOp("getIdentityAndZuoraEmailsForAccounts")
      _ <- StopIfNoContactsToChange(mergeRequest.winningSFContact.id, zuoraAccountAndEmails.map(_.sfContactId))
      _ <- validateLastNames(zuoraAccountAndEmails.map(_.lastName)) match {
        case Differing(elements) => ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing lastname: $elements"))
        case _ => ContinueProcessing(())
      }
      firstNameToUse <- GetFirstNameToUse(mergeRequest.winningSFContact, zuoraAccountAndEmails)
      allSFContactIds = SFContactsForMerge(mergeRequest.winningSFContact.id, zuoraAccountAndEmails.map(_.sfContactId))
      dedupedContactIds = DedupSfContacts.apply(allSFContactIds)
    } yield ZuoraData(firstNameToUse, dedupedContactIds)
  }

  case class ZuoraData(
    firstNameToUse: Option[GetZuoraContactDetails.FirstName],
    dedupedContactIds: SFContactsForMerge[SFContactId]
  )

}
trait ZuoraSteps {
  def apply(mergeRequest: MergeRequest): ApiGatewayOp[ZuoraData]
}

object WireRequestToDomainObject {

  implicit val readWireSfContactRequest = Json.reads[WireSfContactRequest]

  case class WireSfContactRequest(
    fullContactId: String,
    billingAccountZuoraIds: List[String],
    accountId: String
  )

  case class MergeRequest(
    winningSFContact: WinningSFContact,
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
        WinningSFContact(SFContactId(request.fullContactId)),
        CRMAccountId(request.accountId),
        accountIds
      )
    }

}
