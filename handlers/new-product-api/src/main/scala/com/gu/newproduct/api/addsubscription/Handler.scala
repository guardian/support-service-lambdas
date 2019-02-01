package com.gu.newproduct.api.addsubscription

import java.io.{InputStream, OutputStream}
import java.time.{LocalDate, LocalDateTime}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.contributions.SendConfirmationEmailContributions.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.contributions.{ContributionFields, SendConfirmationEmailContributions}
import com.gu.newproduct.api.addsubscription.email.voucher.{SendConfirmationEmailVoucher, VoucherEmailData}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.contribution.ContributionValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.contribution.{ContributionAccountValidation, ContributionCustomerData, ContributionValidations, GetContributionCustomerData}
import com.gu.newproduct.api.addsubscription.validation.voucher.{GetVoucherCustomerData, ValidateContactsForVoucher, VoucherAccountValidation, VoucherCustomerData}
import com.gu.newproduct.api.addsubscription.validation.{ValidationResult, _}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BillToContact
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetContacts, _}
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanId}
import com.gu.newproduct.api.productcatalog._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage, ZuoraEnvironment}
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
      Steps.operationForEffects(RawEffects.response, RawEffects.stage, GetFromS3.fetchString, AwsSQSSend.apply, RawEffects.now)
    }
}

object Steps {
  def createZuoraSubRequest(
    request: AddSubscriptionRequest,
    acceptanceDate: LocalDate,
    chargeOverride: Option[ChargeOverride],
    productRatePlanId: ProductRatePlanId
  ) = ZuoraCreateSubRequest(
    productRatePlanId = productRatePlanId,
    accountId = request.zuoraAccountId,
    maybeChargeOverride = chargeOverride,
    acceptanceDate = acceptanceDate,
    acquisitionCase = request.acquisitionCase,
    acquisitionSource = request.acquisitionSource,
    createdByCSR = request.createdByCSR
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
    billToContact: BillToContact,
    amountMinorUnits: AmountMinorUnits
  ) =
    ContributionsEmailData(
      accountId = request.zuoraAccountId,
      currency = currency,
      paymentMethod = paymentMethod,
      amountMinorUnits = amountMinorUnits,
      firstPaymentDate = firstPaymentDate,
      billTo = billToContact,
      planId = request.planId
    )

  def handleRequest(
    addContribution: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName],
    addVoucher: AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName]
  )(
    apiGatewayRequest: ApiGatewayRequest
  ): Future[ApiResponse] = (for {
    request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
    subscriptionName <- request.planId match {
      case MonthlyContribution | AnnualContribution => addContribution(request)
      case _ => addVoucher(request)
    }
  } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse

  def addContributionSteps(
    getPlanAndCharge: PlanId => Option[PlanAndCharge],
    getCustomerData: ZuoraAccountId => ApiGatewayOp[ContributionCustomerData],
    contributionValidations: (ValidatableFields, PlanId, Currency) => ValidationResult[AmountMinorUnits],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (Option[SfContactId], ContributionsEmailData) => AsyncApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = {
    for {
      customerData <- getCustomerData(request.zuoraAccountId).toAsync
      ContributionCustomerData(account, paymentMethod, subscriptions, contacts) = customerData
      validatableFields = ValidatableFields(request.amountMinorUnits, request.startDate)
      amountMinorUnits <- contributionValidations(validatableFields, request.planId, account.currency).toApiGatewayOp.toAsync
      acceptanceDate = request.startDate.plusDays(paymentDelayFor(paymentMethod))
      planAndCharge <- getPlanAndCharge(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!")).toAsync
      chargeOverride = ChargeOverride(amountMinorUnits, planAndCharge.productRatePlanChargeId)
      zuoraCreateSubRequest = createZuoraSubRequest(request, acceptanceDate, Some(chargeOverride), planAndCharge.productRatePlanId)
      subscriptionName <- createSubscription(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")
      contributionEmailData = toContributionEmailData(request, account.currency, paymentMethod, acceptanceDate, contacts.billTo, amountMinorUnits)
      _ <- sendConfirmationEmail(account.sfContactId, contributionEmailData).recoverAndLog("send contribution confirmation email")
    } yield subscriptionName
  }

  def addVoucherSteps(
    getPlan: PlanId => Plan,
    getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
    getCustomerData: ZuoraAccountId => ApiGatewayOp[VoucherCustomerData],
    validateStartDate: (PlanId, LocalDate) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (Option[SfContactId], VoucherEmailData) => AsyncApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- validateStartDate(request.planId, request.startDate).toApiGatewayOp.toAsync
    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    zuoraRatePlanId <- getZuoraRateplanId(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!")).toAsync
    createSubRequest = createZuoraSubRequest(
      request = request,
      acceptanceDate = request.startDate,
      chargeOverride = None,
      productRatePlanId = zuoraRatePlanId
    )
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create voucher subscription")
    plan = getPlan(request.planId)
    voucherEmailData = VoucherEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      firstPaperDate = request.startDate,
      subscriptionName = subscriptionName,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, voucherEmailData).recoverAndLog("send voucher confirmation email")
  } yield subscriptionName

  def operationForEffects(
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    currentDatetime: () => LocalDateTime
  ): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage)
      zuoraConfig <- {
        val loadConfig = LoadConfigModule(stage, fetchString)
        loadConfig[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      }
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      queueNames = emailQueuesFor(stage)

      contributionSqsSend = awsSQSSend(queueNames.contributions)
      contributionEtSqsSend = EtSqsSend[ContributionFields](contributionSqsSend) _
      getCurrentDate = () => RawEffects.now().toLocalDate
      validatorFor = DateValidator.validatorFor(getCurrentDate, _: DateRule)
      zuoraToPlanId = zuoraIds.voucherZuoraIds.zuoraIdToPlanid.get _
      zuoraEnv = ZuoraEnvironment.EnvForStage(stage)
      plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraToPlanId).toApiGatewayOp("get prices from zuora catalog")
      catalog = NewProductApi.catalog(plansWithPrice.get)

      isValidStartDateForPlan = Function.uncurried(
        catalog.planForId andThen { plan =>
          StartDateValidator.fromRule(validatorFor, plan.startDateRules)
        }
      )
      currentDate = () => currentDatetime().toLocalDate
      createSubscription = CreateSubscription(zuoraClient.post[WireCreateRequest, WireSubscription], currentDate) _
      contributionIds = List(zuoraIds.contributionsZuoraIds.monthly.productRatePlanId, zuoraIds.contributionsZuoraIds.annual.productRatePlanId)
      getCustomerData = getValidatedContributionCustomerData(zuoraClient, contributionIds)
      isValidContributionStartDate = isValidStartDateForPlan(MonthlyContribution, _: LocalDate)
      validateRequest = ContributionValidations(isValidContributionStartDate, AmountLimits.limitsFor) _

      sendConfirmationEmail = SendConfirmationEmailContributions(contributionEtSqsSend, getCurrentDate) _
      planAndChargeForContributionPlanId = zuoraIds.contributionsZuoraIds.byApiPlanId.get _
      contributionSteps = addContributionSteps(planAndChargeForContributionPlanId, getCustomerData, validateRequest, createSubscription, sendConfirmationEmail) _
      voucherSqsSend = awsSQSSend(queueNames.voucher)
      voucherEtSqsSend = EtSqsSend[VoucherEmailData](voucherSqsSend) _
      sendVoucherEmail = SendConfirmationEmailVoucher(voucherEtSqsSend, getCurrentDate) _

      getZuoraIdForVoucherPlan = zuoraIds.voucherZuoraIds.byApiPlanId.get _
      getVoucherData = getValidatedVoucherCustomerData(zuoraClient)
      voucherSteps = addVoucherSteps(
        catalog.planForId,
        getZuoraIdForVoucherPlan,
        getVoucherData,
        isValidStartDateForPlan,
        createSubscription,
        sendVoucherEmail
      ) _

      addSubSteps = handleRequest(
        addContribution = contributionSteps,
        addVoucher = voucherSteps
      ) _

      configuredOp = Operation.async(
        steps = addSubSteps,
        healthcheck = () =>
          HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage))
      )
    } yield configuredOp

  def getValidatedContributionCustomerData(
    zuoraClient: Requests,
    contributionPlanIds: List[ProductRatePlanId]
  ): ZuoraAccountId => ApiGatewayOp[ContributionCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate ContributionAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val validateSubs = ValidateSubscriptions(contributionPlanIds) _
    val getValidatedSubs = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _ andValidateWith validateSubs
    val getContactsFromZuora = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getUnvalidatedContacts = getContactsFromZuora.andThen(_.toApiGatewayOp("getting contacts from Zuora"))
    GetContributionCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getUnvalidatedContacts,
      getAccountSubscriptions = getValidatedSubs,
      _
    )
  }

  def getValidatedVoucherCustomerData(zuoraClient: Requests): ZuoraAccountId => ApiGatewayOp[VoucherCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate VoucherAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val getContacts = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getValidatedContacts = getContacts andValidateWith (ValidateContactsForVoucher.apply _)
    GetVoucherCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getValidatedContacts,
      _
    )
  }

  case class EmailQueueNames(contributions: QueueName, voucher: QueueName)
  def emailQueuesFor(stage: Stage) = stage match {
    case Stage("PROD") | Stage("CODE") => EmailQueueNames(contributions = QueueName("contributions-thanks"), voucher = QueueName("subs-welcome-email"))
    case _ => EmailQueueNames(contributions = QueueName("contributions-thanks-dev"), voucher = QueueName("subs-welcome-email-dev"))
  }

}

