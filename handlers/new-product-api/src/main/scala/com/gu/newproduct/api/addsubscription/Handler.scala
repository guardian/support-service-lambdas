package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Currency
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.SendConfirmationEmail
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.{CreateSubscription, GetAccount, GetContacts}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.ZuoraContacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{ExecutionContext, Future}
object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      Steps.operationForEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString)
    }

}

object Steps {

  def addSubscriptionSteps(
    prerequisiteCheck: AddSubscriptionRequest => AsyncApiGatewayOp[PaymentMethod],
    createMonthlyContribution: CreateReq => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (ZuoraAccountId, Currency, Option[DirectDebit], Int) => AsyncApiGatewayOp[Unit]
  )(apiGatewayRequest: ApiGatewayRequest): Future[ApiResponse] = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
      paymentMethod <- prerequisiteCheck(request)
      req = CreateReq(
        request.zuoraAccountId,
        request.amountMinorUnits,
        request.startDate,
        request.acquisitionCase,
        request.acquisitionSource,
        request.createdByCSR
      )
      subscriptionName <- createMonthlyContribution(req).toAsyncApiGatewayOp("create monthly contribution")
      //TODO SEE HOW TO PASS THE PARAMS TO THE SEND EMAIL FUNCTION IN A NICER WAY
      directDebit = paymentMethod match {
        case d: DirectDebit => Some(d)
        case _ => None
      }
      r <- sendConfirmationEmail(request.zuoraAccountId, GBP, directDebit, request.amountMinorUnits) //TODO REMOVE HARDCODED CURRENCY HERE
    } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
  }

  val confirmationEmailQueueFor = Map(
    Stage("DEV") -> "contributions-thanks-dev",
    Stage("PROD") -> "contributions-thanks"
  )

  def operationForEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      loadConfig = LoadConfigModule(stage, fetchString)
      zuoraConfig <- loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      sqsSend = AwsSQSSend(QueueName("contributions-thanks")) _
      getContacts = GetContacts(zuoraClient.get[ZuoraContacts]) _
      createMonthlyContribution = CreateSubscription(zuoraIds.monthly, zuoraClient.post[WireCreateRequest, WireSubscription]) _
      contributionIds = List(zuoraIds.monthly.productRatePlanId, zuoraIds.annual.productRatePlanId)
      prerequesiteCheck = PrerequisiteCheck(zuoraClient, contributionIds, RawEffects.now, scala.concurrent.ExecutionContext.Implicits.global) _
      sendConfirmationEmail = SendConfirmationEmail(() => RawEffects.now().toLocalDate, sqsSend, getContacts) _
      configuredOp = Operation.async(
        steps = addSubscriptionSteps(prerequesiteCheck, createMonthlyContribution, sendConfirmationEmail),
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp
}

