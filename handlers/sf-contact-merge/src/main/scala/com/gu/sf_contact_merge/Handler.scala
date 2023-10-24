package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
import com.gu.sf_contact_merge.DomainSteps.MergeRequest
import com.gu.sf_contact_merge.SFSteps.GetSfContact
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps
import com.gu.sf_contact_merge.getsfcontacts.ToSfContactRequest.WireResult
import com.gu.sf_contact_merge.getsfcontacts.{ToSfContactRequest, WireContactToSfContact}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.CRMAccountId
import com.gu.sf_contact_merge.update.{UpdateAccountSFLinks, UpdateSFContacts, UpdateSalesforceIdentityId}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.zuora.SafeQueryBuilder.MaybeNonEmptyList
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.Json

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      operationForEffects(RawEffects.stage, GetFromS3.fetchString, RawEffects.response)
    }

  def operationForEffects(
      stage: Stage,
      fetchString: StringFromS3,
      getResponse: Request => Response,
  ): ApiGatewayOp[Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    for {

      zuoraRestConfig <- loadConfig.load[ZuoraRestConfig].toApiGatewayOp("load trusted Api config")
      requests = ZuoraRestRequestMaker(getResponse, zuoraRestConfig)
      zuoraQuerier = ZuoraQuery(requests)

      sfConfig <- loadConfig.load[SFAuthConfig].toApiGatewayOp("load trusted Api config")
      sfAuth <- SalesforceClient(getResponse, sfConfig).value.toApiGatewayOp("Failed to authenticate with Salesforce")

    } yield Operation.noHealthcheck {
      WireRequestToDomainObject {
        val sfGet = sfAuth.wrapWith(JsonHttp.get)
        val getSfContact =
          GetSfContact(sfGet.setupRequest(ToSfContactRequest.apply).parse[WireResult].map(WireContactToSfContact.apply))
        DomainSteps(
          ZuoraSteps(GetIdentityAndZuoraEmailsForAccountsSteps(zuoraQuerier)),
          UpdateSFContacts(UpdateSalesforceIdentityId(sfAuth.wrapWith(JsonHttp.patch))),
          UpdateAccountSFLinks(requests.put),
          SFSteps(getSfContact),
        )
      }
    }
  }

}

object WireRequestToDomainObject {

  implicit val readWireSfContactRequest = Json.reads[WireSfContactRequest]

  case class WireSfContactRequest(
      fullContactId: String,
      billingAccountZuoraIds: List[String],
      accountId: String,
  )

  def apply(
      steps: MergeRequest => ResponseModels.ApiResponse,
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
        accountIds,
      )
    }

}
