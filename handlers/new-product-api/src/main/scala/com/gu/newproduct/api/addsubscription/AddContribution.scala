package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.i18n.Currency
import com.gu.newproduct.api.EmailQueueNames
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.{ContributionsEmailData, EtSqsSend, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.validation.contribution.ContributionValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.contribution.{ContributionAccountValidation, ContributionCustomerData, ContributionValidations, GetContributionCustomerData}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlyContribution
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Catalog, Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.newproduct.api.addsubscription.email.contributions.ContributionEmailDataSerialiser._

import scala.concurrent.Future

object AddContribution {
  def steps(
    getPlan: PlanId => Plan,
    getCurrentDate: () => LocalDate,
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
      chargeOverride = ChargeOverride(Some(amountMinorUnits), planAndCharge.productRatePlanChargeId)
      zuoraCreateSubRequest = ZuoraCreateSubRequest(
        request = request,
        acceptanceDate = acceptanceDate,
        ratePlans = List(
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = planAndCharge.productRatePlanId,
            maybeChargeOverride = Some(chargeOverride),
            maybeTriggerDate = None
          )
        )
      )
      subscriptionName <- createSubscription(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly contribution")
      contributionEmailData = toContributionEmailData(
        request = request,
        currency = account.currency,
        paymentMethod = paymentMethod,
        firstPaymentDate = acceptanceDate,
        contacts = contacts,
        amountMinorUnits = amountMinorUnits,
        plan = getPlan(request.planId),
        currentDate = getCurrentDate()
      )
      _ <- sendConfirmationEmail(account.sfContactId, contributionEmailData).recoverAndLog("send contribution confirmation email")
    } yield subscriptionName
  }

  def wireSteps(
    catalog: Catalog,
    zuoraIds: ZuoraIds,
    zuoraClient: Requests,
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    emailQueueNames: EmailQueueNames,
    currentDate: () => LocalDate
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {

    val planAndChargeForContributionPlanId = zuoraIds.contributionsZuoraIds.byApiPlanId.get _
    val contributionIds = List(zuoraIds.contributionsZuoraIds.monthly.productRatePlanId, zuoraIds.contributionsZuoraIds.annual.productRatePlanId)
    val getCustomerData = getValidatedContributionCustomerData(zuoraClient, contributionIds)
    val isValidContributionStartDate = isValidStartDateForPlan(MonthlyContribution, _: LocalDate)
    val validateRequest = ContributionValidations(isValidContributionStartDate, AmountLimits.limitsFor) _
    val contributionSqsSend = awsSQSSend(emailQueueNames.contributions)

    val contributionsSqsSend = awsSQSSend(emailQueueNames.contributions)
    val contributionsBrazeConfirmationSqsSend = EtSqsSend[ContributionsEmailData](contributionSqsSend) _
    val sendConfirmationEmail = SendConfirmationEmail(contributionsBrazeConfirmationSqsSend) _

    AddContribution.steps(
      getPlan = catalog.planForId,
      getCurrentDate = currentDate,
      getPlanAndCharge = planAndChargeForContributionPlanId,
      getCustomerData = getCustomerData,
      contributionValidations = validateRequest,
      createSubscription = createSubscription,
      sendConfirmationEmail = sendConfirmationEmail
    ) _

  }

  def paymentDelayFor(paymentMethod: PaymentMethod): Long = paymentMethod match {
    case d: DirectDebit => 10l
    case _ => 0l
  }

  def toContributionEmailData(
    request: AddSubscriptionRequest,
    plan: Plan,
    currency: Currency,
    paymentMethod: PaymentMethod,
    firstPaymentDate: LocalDate,
    contacts: Contacts,
    amountMinorUnits: AmountMinorUnits,
    currentDate: LocalDate
  ) =
    ContributionsEmailData(
      accountId = request.zuoraAccountId,
      currency = currency,
      plan = plan,
      paymentMethod = paymentMethod,
      amountMinorUnits = amountMinorUnits,
      firstPaymentDate = firstPaymentDate,
      contacts = contacts,
      created = currentDate
    )

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
    val validateSubs = ValidateSubscriptions(contributionPlanIds, "Zuora account already has an active recurring contribution subscription") _
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
}
