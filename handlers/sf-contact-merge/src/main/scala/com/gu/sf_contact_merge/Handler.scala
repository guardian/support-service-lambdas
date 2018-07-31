package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, SFPointer}
import com.gu.sf_contact_merge.update.{SetOrClearZuoraIdentityId, UpdateAccountSFLinks, UpdateStepsWiring}
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId, SFContactId}
import com.gu.sf_contact_merge.validate.{GetIdentityAndZuoraEmailsForAccounts, ValidationSteps}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.MaybeNonEmptyList
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.NonEmptyList

object Handler {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runForLegacyTestsSeeTestingMd(RawEffects.stage, GetFromS3.fetchString, RawEffects.response, LambdaIO(inputStream, outputStream, context))
  }

  def runForLegacyTestsSeeTestingMd(stage: Stage, fetchString: StringFromS3, getResponse: Request => Response, lambdaIO: LambdaIO) =
    ApiGatewayHandler(lambdaIO) {
      operationForEffects(stage, fetchString, getResponse)
    }

  def operationForEffects(stage: Stage, fetchString: StringFromS3, getResponse: Request => Response): ApiGatewayOp[Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    val fConfig = for {
      zuoraRestConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load trusted Api config")
      requests = ZuoraRestRequestMaker(getResponse, zuoraRestConfig)
      zuoraQuerier = ZuoraQuery(requests)
      wiredSteps = steps(
        ValidationSteps(GetIdentityAndZuoraEmailsForAccounts(zuoraQuerier)),
        sfPointer => UpdateStepsWiring(
          SetOrClearZuoraIdentityId(requests),
          UpdateAccountSFLinks(requests)(sfPointer)
        )
      ) _
      configuredOp = Operation.noHealthcheck(wiredSteps)
    } yield configuredOp
    fConfig
  }

  case class WireSfContactRequest(
    fullContactId: String,
    billingAccountZuoraIds: List[String],
    accountId: String,
    identityId: Option[String]
  )
  implicit val readWireSfContactRequest = Json.reads[WireSfContactRequest]

  def steps(
    validation: Option[IdentityId] => NonEmptyList[AccountId] => ApiGatewayOp[Unit],
    update: SFPointer => Option[IdentityId] => NonEmptyList[AccountId] => ClientFailableOp[Unit]
  )(req: ApiGatewayRequest): ResponseModels.ApiResponse =
    (for {
      wireInput <- req.bodyAsCaseClass[WireSfContactRequest]()
      mergeRequest = wireRequestToDomainObject(wireInput)
      updateAccounts = update(mergeRequest.sFPointer)(mergeRequest.identityId)
      validateAccounts = validation(mergeRequest.identityId)
      accountIds <- MaybeNonEmptyList(mergeRequest.zuoraAccountIds)
        .toApiGatewayContinueProcessing(ApiGatewayResponse.badRequest("no account ids supplied"))
      _ <- validateAccounts(accountIds)
      _ <- updateAccounts(accountIds)
        .toApiGatewayOp("update accounts with winning details")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

  case class MergeRequest(
    sFPointer: SFPointer,
    zuoraAccountIds: List[AccountId],
    identityId: Option[IdentityId]
  )
  def wireRequestToDomainObject(request: Handler.WireSfContactRequest): MergeRequest =
    MergeRequest(
      SFPointer(
        SFContactId(request.fullContactId),
        CRMAccountId(request.accountId)
      ),
      request.billingAccountZuoraIds.map(AccountId.apply),
      request.identityId.map(IdentityId.apply) // need to remove all identity ids and use this identity id on all the accounts after linking
    )

}

