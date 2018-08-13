package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.email.SendConfirmationEmail.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.{ContributionFields, EtSqsSend, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.validation.ValidateRequest.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.WireModel.GetBillToResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetBillToContact, _}
import com.gu.newproduct.api.productcatalog.{DateRule, NewProductApi}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
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
  def createZuoraSubRequest(request: AddSubscriptionRequest, acceptanceDate: LocalDate) = ZuoraCreateSubRequest(
    request.zuoraAccountId,
    request.amountMinorUnits,
    request.startDate,
    acceptanceDate,
    request.acquisitionCase,
    request.acquisitionSource,
    request.createdByCSR
  )

  def paymentDelayFor(paymentMethod: PaymentMethod): Long = paymentMethod match {
    case d: DirectDebit => 10l
    case _ => 0l
  }

  def toContributionEmailData(
    request: AddSubscriptionRequest,
    currency: Currency,
    paymentMethod: PaymentMethod,
    firstPaymentDate: LocalDate,
    billToContact: Contact
  ) =
    ContributionsEmailData(
      accountId = request.zuoraAccountId,
      currency = currency,
      paymentMethod = paymentMethod,
      amountMinorUnits = request.amountMinorUnits,
      firstPaymentDate = firstPaymentDate,
      billTo = billToContact
    )

  def addSubscriptionSteps(
    getCustomerData: ZuoraAccountId => ApiGatewayOp[CustomerData],
    validateRequest: (ValidatableFields, Currency) => ValidationResult[Unit],
    createMonthlyContribution: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: ContributionsEmailData => AsyncApiGatewayOp[Unit]
  )(apiGatewayRequest: ApiGatewayRequest): Future[ApiResponse] = {
    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request with steps1!").toAsync
      customerData <- getCustomerData(request.zuoraAccountId).toAsync
      CustomerData(account, paymentMethod, subscriptions, billTo) = customerData
      validatableFields = ValidatableFields(request.planId, request.amountMinorUnits, request.startDate)
      _ <- validateRequest(validatableFields, account.currency).toApiGatewayOp.toAsync
      acceptanceDate = request.startDate.plusDays(paymentDelayFor(paymentMethod))
      zuoraCreateSubRequest = createZuoraSubRequest(request, acceptanceDate)
      subscriptionName <- createMonthlyContribution(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")
      contributionEmailData = toContributionEmailData(request, account.currency, paymentMethod, acceptanceDate, billTo)
      _ <- sendConfirmationEmail(contributionEmailData)
    } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
  }

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

      createMonthlyContribution = CreateSubscription(zuoraIds.monthly, zuoraClient.post[WireCreateRequest, WireSubscription]) _
      contributionIds = List(zuoraIds.monthly.productRatePlanId, zuoraIds.annual.productRatePlanId)
      getCustomerData = getValidatedCustomerData(zuoraClient, contributionIds)
      validateRequest = ValidateRequest(isValidStartDate, AmountLimits.limitsFor) _
      sendConfirmationEmail = SendConfirmationEmail(contributionsSqsSend, getCurrentDate) _
      configuredOp = Operation.async(
        steps = addSubscriptionSteps(getCustomerData, validateRequest, createMonthlyContribution, sendConfirmationEmail),
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp

  def getValidatedCustomerData(
    zuoraClient: Requests,
    contributionPlanIds: List[ProductRatePlanId]
  ): ZuoraAccountId => ApiGatewayOp[CustomerData] = {

    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = ValidateAccount.apply _,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val validateSubs = ValidateSubscriptions(contributionPlanIds) _
    val getValidatedSubs = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _ andValidateWith validateSubs
    val getBillTo = GetBillToContact(zuoraClient.get[GetBillToResponse]) _

    GetCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getBilltoContact = getBillTo,
      getAccountSubscriptions = getValidatedSubs,
      _
    )
  }

  def emailQueueFor(stage: Stage) = stage match {
    case Stage("PROD") => QueueName("contributions-thanks")
    case Stage("CODE") => QueueName("contributions-thanks")
    case _ => QueueName("contributions-thanks-dev")
  }

}

