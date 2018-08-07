package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.{ContributionFields, EtSqsSend, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.email.SendConfirmationEmail.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.WireModel.GetBillToResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.DirectDebit
import com.gu.newproduct.api.addsubscription.zuora.{CreateSubscription, GetAccount, GetBillToContact}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}
import scala.com.gu.newproduct.api.productcatalog.Catalog
import scala.concurrent.Future

object Handler extends Logging {
  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      Steps.operationForEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString)
    }
}

object Steps {

  def addSubscriptionSteps(
    prerequisiteCheck: AddSubscriptionRequest => AsyncApiGatewayOp[ValidatedFields],
    createMonthlyContribution: CreateReq => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: ContributionsEmailData => AsyncApiGatewayOp[Unit],
  )(apiGatewayRequest: ApiGatewayRequest): Future[ApiResponse] = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
      validatedFields <- prerequisiteCheck(request)

      acceptanceDate = validatedFields.paymentMethod match {
        case d: DirectDebit => request.startDate.plusDays(10)
        case _ => request.startDate
      }

      req = CreateReq(
        request.zuoraAccountId,
        request.amountMinorUnits,
        request.startDate,
        acceptanceDate,
        request.acquisitionCase,
        request.acquisitionSource,
        request.createdByCSR
      )
      subscriptionName <- createMonthlyContribution(req).toAsyncApiGatewayOp("create monthly contribution")

      contributionEmailData = ContributionsEmailData(
        accountId = request.zuoraAccountId,
        currency = validatedFields.currency,
        paymentMethod = validatedFields.paymentMethod,
        amountMinorUnits = req.amountMinorUnits,
        firstPaymentDate = acceptanceDate
      )
      _ <- sendConfirmationEmail(contributionEmailData)
    } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
  }

  def operationForEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      loadConfig = LoadConfigModule(stage, fetchString)
      zuoraConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      sqsSend = AwsSQSSend(emailQueueFor(stage)) _
      contributionsSqsSend = EtSqsSend[ContributionFields](sqsSend) _
      getCurrentDate = () => RawEffects.now().toLocalDate
      catalog = Catalog(getCurrentDate)
      isValidStartDate = catalog.monthlyContribution.startDateRule.isValid
      getBillTo = GetBillToContact(zuoraClient.get[GetBillToResponse]) _
      createMonthlyContribution = CreateSubscription(zuoraIds.monthly, zuoraClient.post[WireCreateRequest, WireSubscription]) _
      contributionIds = List(zuoraIds.monthly.productRatePlanId, zuoraIds.annual.productRatePlanId)
      prerequisiteCheck = PrerequisiteCheck(zuoraClient, contributionIds, isValidStartDate) _
      asyncPrerequisiteCheck = prerequisiteCheck.andThenConvertToAsync
      sendConfirmationEmail = SendConfirmationEmail(contributionsSqsSend, getCurrentDate, getBillTo) _
      configuredOp = Operation.async(
        steps = addSubscriptionSteps(asyncPrerequisiteCheck, createMonthlyContribution, sendConfirmationEmail),
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp

  def emailQueueFor(stage: Stage) = stage match {
    case Stage("PROD") => QueueName("contributions-thanks")
    case Stage("CODE") => QueueName("contributions-thanks")
    case _ => QueueName("contributions-thanks-dev")
  }

}

