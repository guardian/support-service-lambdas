package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.SendConfirmationEmail.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.{ContributionFields, EtSqsSend, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.WireModel.GetBillToResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.{CreateSubscription, GetAccount, GetBillToContact}
import com.gu.newproduct.api.productcatalog.{DateRule, NewProductApi}
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

import scala.concurrent.Future

object Handler extends Logging {
  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      Steps.operationForEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString)
    }
}

object Steps {
  def createZuoraSubRequest(request: AddSubscriptionRequest, acceptanceDate:LocalDate) = ZuoraCreateSubRequest(
    request.zuoraAccountId,
    request.amountMinorUnits,
    request.startDate,
    acceptanceDate,
    request.acquisitionCase,
    request.acquisitionSource,
    request.createdByCSR
  )

  def paymentDelayFor(paymentMethod: PaymentMethod) = paymentMethod match {
    case d: DirectDebit => 10
    case _ => 0
  }

  def contributionEmailData(request: AddSubscriptionRequest,currency:Currency, paymentMethod: PaymentMethod, firstPaymentDate:LocalDate) =
    ContributionsEmailData(
      accountId = request.zuoraAccountId,
      currency = currency,
      paymentMethod = paymentMethod,
      amountMinorUnits = request.amountMinorUnits,
      firstPaymentDate = firstPaymentDate
    )

  def addSubscriptionSteps1(
    getCustomerData: ZuoraAccountId => ApiGatewayOp[CustomerData],
    validateRequest: (AmountMinorUnits, LocalDate) => ValidationResult[Unit],
    createMonthlyContribution: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: ContributionsEmailData => AsyncApiGatewayOp[Unit]
  )(apiGatewayRequest: ApiGatewayRequest): Future[ApiResponse] = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
      CustomerData(account, paymentMethod, subscriptions, billTo) <- getCustomerData(request.zuoraAccountId).toAsync
      _ <- validateRequest(request.amountMinorUnits, request.startDate).toApiGatewayOp.toAsync //todo maybe we don't need the two step conversion
      acceptanceDate = request.startDate.plusDays(paymentDelayFor(paymentMethod))
      zuoraCreateSubRequest = createZuoraSubRequest(request, acceptanceDate)
      subscriptionName <- createMonthlyContribution(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")
      contributionEmailData = contributionEmailData(request, account.currency, paymentMethod, acceptanceDate)
      _ <- sendConfirmationEmail(contributionEmailData)
    } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
  }

  def addSubscriptionSteps(
    // getCustomerData: ZuoraAccountId => CustomerData,
    prerequisiteCheck: AddSubscriptionRequest => AsyncApiGatewayOp[ValidatedFields],
    createMonthlyContribution: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: ContributionsEmailData => AsyncApiGatewayOp[Unit]
  )(apiGatewayRequest: ApiGatewayRequest): Future[ApiResponse] = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
      //  CustomerData(account,paymentMethod, subscriptions, billTo) <- getCustomerData(request.zuoraAccountId)
      validatedFields <- prerequisiteCheck(request)

      acceptanceDate = validatedFields.paymentMethod match {
        case d: DirectDebit => request.startDate.plusDays(10)
        case _ => request.startDate
      }

      zuoraCreateSubRequest = ZuoraCreateSubRequest(
        request.zuoraAccountId,
        request.amountMinorUnits,
        request.startDate,
        acceptanceDate,
        request.acquisitionCase,
        request.acquisitionSource,
        request.createdByCSR
      )
      subscriptionName <- createMonthlyContribution(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")

      contributionEmailData = ContributionsEmailData(
        accountId = request.zuoraAccountId,
        currency = validatedFields.currency,
        paymentMethod = validatedFields.paymentMethod,
        amountMinorUnits = zuoraCreateSubRequest.amountMinorUnits,
        firstPaymentDate = acceptanceDate
      )
      _ <- sendConfirmationEmail(contributionEmailData)
    } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
  }
  def operationForEffects1(response: Request => Response, stage: Stage, fetchString: StringFromS3): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      zuoraConfig <- {
        val loadConfig = LoadConfigModule(stage, fetchString)
        loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      }
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      sqsSend = AwsSQSSend(emailQueueFor(stage)) _
      contributionsSqsSend = EtSqsSend[ContributionFields](sqsSend) _
      getCurrentDate = () => RawEffects.now().toLocalDate
      validatorFor = DateValidator.validatorFor(getCurrentDate, _: DateRule)
      isValidStartDate = StartDateValidator.fromRule(validatorFor, NewProductApi.catalog.monthlyContribution.startDateRules)
      getBillTo = GetBillToContact(zuoraClient.get[GetBillToResponse]) _
      createMonthlyContribution = CreateSubscription(zuoraIds.monthly, zuoraClient.post[WireCreateRequest, WireSubscription]) _
      contributionIds = List(zuoraIds.monthly.productRatePlanId, zuoraIds.annual.productRatePlanId)
      validateRequest = ValidateRequest(isValidStartDate, AmountLimits.limitsFor) _
      prerequisiteCheck = PrerequisiteCheck(zuoraClient, contributionIds, isValidStartDate) _
      asyncPrerequisiteCheck = prerequisiteCheck.andThenConvertToAsync
      sendConfirmationEmail = SendConfirmationEmail(contributionsSqsSend, getCurrentDate, getBillTo) _
      configuredOp = Operation.async(
        steps = addSubscriptionSteps(asyncPrerequisiteCheck, createMonthlyContribution, sendConfirmationEmail),
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp
  def operationForEffects(response: Request => Response, stage: Stage, fetchString: StringFromS3): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      zuoraConfig <- {
        val loadConfig = LoadConfigModule(stage, fetchString)
        loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      }
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      sqsSend = AwsSQSSend(emailQueueFor(stage)) _
      contributionsSqsSend = EtSqsSend[ContributionFields](sqsSend) _
      getCurrentDate = () => RawEffects.now().toLocalDate
      validatorFor = DateValidator.validatorFor(getCurrentDate, _: DateRule)
      isValidStartDate = StartDateValidator.fromRule(validatorFor, NewProductApi.catalog.monthlyContribution.startDateRules)
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

