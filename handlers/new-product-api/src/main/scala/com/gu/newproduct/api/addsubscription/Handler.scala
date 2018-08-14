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
import com.gu.newproduct.api.addsubscription.validation.ContributionValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetContacts, _}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlyContribution
import com.gu.newproduct.api.productcatalog.{DateRule, NewProductApi}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
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
  def createZuoraSubRequest(request: AddSubscriptionRequest, acceptanceDate: LocalDate, amountMinorUnits: AmountMinorUnits) = ZuoraCreateSubRequest(
    request.zuoraAccountId,
    amountMinorUnits,
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
    billToContact: Contact,
    amountMinorUnits: AmountMinorUnits
  ) =
    ContributionsEmailData(
      accountId = request.zuoraAccountId,
      currency = currency,
      paymentMethod = paymentMethod,
      amountMinorUnits = amountMinorUnits,
      firstPaymentDate = firstPaymentDate,
      billTo = billToContact
    )

  def someFunctionName(
    addContribution: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
    addVoucher: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName]
  )(
    apiGatewayRequest: ApiGatewayRequest
  ): Future[ApiResponse] = (for {
    request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
    subscriptionName <- request.planId match {
      case MonthlyContribution => addContribution(request)
      case _ => addVoucher(request)
    }
  } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse

  def addContributionSteps(
    getCustomerData: ZuoraAccountId => ApiGatewayOp[CustomerData],
    contributionValidations: (ValidatableFields, Currency) => ValidationResult[AmountMinorUnits],
    createMonthlyContribution: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: ContributionsEmailData => AsyncApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = {
    for {
      customerData <- getCustomerData(request.zuoraAccountId).toAsync
      CustomerData(account, paymentMethod, subscriptions, contacts) = customerData
      validatableFields = ValidatableFields(request.amountMinorUnits, request.startDate, account.identityId)
      amountMinorUnits <- contributionValidations(validatableFields, account.currency).toApiGatewayOp.toAsync
      acceptanceDate = request.startDate.plusDays(paymentDelayFor(paymentMethod))
      zuoraCreateSubRequest = createZuoraSubRequest(request, acceptanceDate, amountMinorUnits)
      subscriptionName <- createMonthlyContribution(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")
      contributionEmailData = toContributionEmailData(request, account.currency, paymentMethod, acceptanceDate, contacts.billTo, amountMinorUnits)
      _ <- sendConfirmationEmail(contributionEmailData)
    } yield subscriptionName
  }

  def addVoucherSteps(
    getCustomerData: ZuoraAccountId => ApiGatewayOp[CustomerData],
  )
    (request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    //CustomerData(account, paymentMethod, subscriptions, billTo) = customerData
    //  amountMinorUnits <- validateRequest(validatableFields, account.currency).toApiGatewayOp.toAsync
    //  acceptanceDate = request.startDate.plusDays(paymentDelayFor(paymentMethod))
    //  zuoraCreateSubRequest = createZuoraSubRequest(request, acceptanceDate, amountMinorUnits)
    // subscriptionName <- createMonthlyContribution(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")
    // contributionEmailData = toContributionEmailData(request, account.currency, paymentMethod, acceptanceDate, billTo, amountMinorUnits)
    // _ <- sendConfirmationEmail(contributionEmailData)

  } yield SubscriptionName("fakeSub")


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
      validateRequest = ContributionValidations(isValidStartDate, AmountLimits.limitsFor) _
      sendConfirmationEmail = SendConfirmationEmail(contributionsSqsSend, getCurrentDate) _
      getVoucherData = getValidatedVoucherCustomerData(zuoraClient, contributionIds)
      contributionSteps = addContributionSteps(getCustomerData, validateRequest, createMonthlyContribution, sendConfirmationEmail) _
      voucherSteps = addVoucherSteps(getVoucherData) _
      addSubSteps = someFunctionName(
        addContribution = contributionSteps,
        addVoucher = voucherSteps
      ) _

      configuredOp = Operation.async(
        steps = addSubSteps,
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp

  def getValidatedCustomerData(
    zuoraClient: Requests,
    contributionPlanIds: List[ProductRatePlanId]
  ): ZuoraAccountId => ApiGatewayOp[CustomerData] = {

    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith(
      validate = ValidateAccount.apply _,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val validateSubs = ValidateSubscriptions(contributionPlanIds) _
    val getValidatedSubs = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _ andValidateWith validateSubs
    val getContactsFromZuora = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getUnvalidatedContacts = getContactsFromZuora.andThen(_.toApiGatewayOp("getting contacts from Zuora"))
    GetCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getUnvalidatedContacts,
      getAccountSubscriptions = getValidatedSubs,
      _
    )
  }
  def getValidatedVoucherCustomerData(
    zuoraClient: Requests,
    contributionPlanIds: List[ProductRatePlanId]
  ): ZuoraAccountId => ApiGatewayOp[CustomerData] = {

    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith(
      validate = ValidateAccount.apply _,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val validateSubs = ValidateSubscriptions(contributionPlanIds) _
    val getValidatedSubs = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _ andValidateWith validateSubs
    val getContacts = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getValidatedContacts = getContacts andValidateWith (ValidateContactsForVoucher.apply _)
    GetCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getValidatedContacts,
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

