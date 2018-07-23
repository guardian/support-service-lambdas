package com.gu.sf_contact_merge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.{AccountId, EmailAddress}
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, ResponseModels}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.MaybeNonEmptyList
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.NonEmptyList
import scalaz.syntax.traverse.ToTraverseOps

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
        GetZuoraEmailsForAccounts(zuoraQuerier),
        UpdateAccountSFLinks(requests)
      ) _
      configuredOp = Operation.noHealthcheck(wiredSteps)
    } yield configuredOp
    fConfig
  }

  case class WireSfContactRequest(
    fullContactId: String,
    billingAccountZuoraIds: List[String],
    accountId: String
  )
  implicit val readWireSfContactRequest = Json.reads[WireSfContactRequest]

  def steps(
    getZuoraEmails: NonEmptyList[AccountId] => ClientFailableOp[List[Option[EmailAddress]]],
    updateAccountSFLinks: (String, String) => AccountId => ClientFailableOp[Unit]
  )(req: ApiGatewayRequest): ResponseModels.ApiResponse =
    (for {
      input <- req.bodyAsCaseClass[WireSfContactRequest]()
      someAccountIds = input.billingAccountZuoraIds.map(AccountId.apply)
      accountIds <- MaybeNonEmptyList(someAccountIds).toApiGatewayContinueProcessing(ApiGatewayResponse.badRequest("no account ids supplied"))
      emailAddresses <- getZuoraEmails(accountIds).toApiGatewayOp("get zuora emails")
      _ <- AssertSameEmails(emailAddresses)
      updateAccount = updateAccountSFLinks(input.fullContactId, input.accountId)
      _ <- accountIds.traverseU(updateAccount).toApiGatewayOp("updating all the accounts")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}

object AssertSameEmails {

  def apply(emailAddresses: List[Option[EmailAddress]]): ApiGatewayOp[Unit] = {
    if (emailAddresses.distinct.size == 1) ContinueProcessing(()) else ReturnWithResponse(ApiGatewayResponse.notFound("those zuora accounts had differing emails"))
  }

}
