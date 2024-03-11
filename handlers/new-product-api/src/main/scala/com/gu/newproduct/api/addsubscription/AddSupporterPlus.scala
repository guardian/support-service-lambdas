package com.gu.newproduct.api.addsubscription

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.serialisers.SupporterPlusEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.{EtSqsSend, SendConfirmationEmail, SupporterPlusEmailData}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.validation.supporterplus.SupporterPlusValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.supporterplus.{AmountLimits, _}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlySupporterPlus
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharges, ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp

import java.time.LocalDate
import scala.concurrent.Future
import AddSupporterPlus._

class AddSupporterPlus(
  getPlan: PlanId => Plan,
  getCurrentDate: () => LocalDate,
  getPlanAndCharge: PlanId => Option[PlanAndCharges],
  getCustomerData: ZuoraAccountId => ApiGatewayOp[SupporterPlusCustomerData],
  supporterPlusValidations: (
    SupporterPlusValidations.ValidatableFields,
      PlanId,
      Currency,
    ) => ValidationResult[AmountMinorUnits],
  createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
  sendConfirmationEmail: (Option[SfContactId], SupporterPlusEmailData) => AsyncApiGatewayOp[Unit],
) extends AddSpecificProduct {
  override def addProduct(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] =
    for {
      customerData <- getCustomerData(request.zuoraAccountId).toAsync
      SupporterPlusCustomerData(account, paymentMethod, subscriptions, contacts) = customerData
      validatableFields = ValidatableFields(request.amountMinorUnits, request.startDate)
      amountMinorUnits <- supporterPlusValidations(
        validatableFields,
        request.planId,
        account.currency,
      ).toApiGatewayOp.toAsync
      acceptanceDate = request.startDate
      plan = getPlan(request.planId)
      planAndCharge <- getPlanAndCharge(request.planId)
        .toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!"))
        .toAsync
      contributionAmount = getContributionAmount(amountMinorUnits, account.currency, plan)
      chargeOverride = ChargeOverride(Some(contributionAmount), planAndCharge.contributionProductRatePlanChargeId, None)
      ratePlans = request.discountRatePlanId
        .map(id =>
          List(
            ZuoraCreateSubRequestRatePlan(
              productRatePlanId = id,
              maybeChargeOverride = None,
            ),
            ZuoraCreateSubRequestRatePlan(
              productRatePlanId = planAndCharge.productRatePlanId,
              maybeChargeOverride = Some(chargeOverride),
            ),
          ),
        )
        .getOrElse(
          List(
            ZuoraCreateSubRequestRatePlan(
              productRatePlanId = planAndCharge.productRatePlanId,
              maybeChargeOverride = Some(chargeOverride),
            ),
          ),
        )
      zuoraCreateSubRequest = ZuoraCreateSubRequest(
        request = request,
        acceptanceDate = acceptanceDate,
        ratePlans = ratePlans,
      )
      subscriptionName <- createSubscription(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly supporter plus")
      supporterPlusEmailData = toSupporterPlusEmailData(
        request = request,
        currency = account.currency,
        paymentMethod = paymentMethod,
        firstPaymentDate = acceptanceDate,
        contacts = contacts,
        amountMinorUnits = amountMinorUnits,
        plan = plan,
        currentDate = getCurrentDate(),
      )
      _ <- sendConfirmationEmail(account.sfContactId, supporterPlusEmailData).recoverAndLog(
        "send supporter plus confirmation email",
      )
    } yield subscriptionName
}

object AddSupporterPlus {

  def wireSteps(
      catalog: Map[PlanId, Plan],
      zuoraIds: ZuoraIds,
      zuoraClient: Requests,
      isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
      createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
      awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
      emailQueueName: QueueName,
      currentDate: () => LocalDate,
  ): AddSpecificProduct = {

    val planAndChargeForSupporterPlusPlanId = zuoraIds.supporterPlusZuoraIds.planAndChargeByApiPlanId.get _
    val supporterPlusIds = List(
      zuoraIds.supporterPlusZuoraIds.monthlyV2.productRatePlanId,
      zuoraIds.supporterPlusZuoraIds.annualV2.productRatePlanId,
    )
    val getCustomerData = getValidatedSupporterPlusCustomerData(zuoraClient, supporterPlusIds)
    val isValidSupporterPlusStartDate = isValidStartDateForPlan(MonthlySupporterPlus, _: LocalDate)
    val validateRequest = SupporterPlusValidations(isValidSupporterPlusStartDate, AmountLimits.limitsFor) _

    val supporterPlusSqsSend = awsSQSSend(emailQueueName)
    val supporterPlusBrazeConfirmationSqsSend = EtSqsSend[SupporterPlusEmailData](supporterPlusSqsSend) _
    val sendConfirmationEmail = SendConfirmationEmail(supporterPlusBrazeConfirmationSqsSend) _

    new AddSupporterPlus(
      getPlan = catalog,
      getCurrentDate = currentDate,
      getPlanAndCharge = planAndChargeForSupporterPlusPlanId,
      getCustomerData = getCustomerData,
      supporterPlusValidations = validateRequest,
      createSubscription = createSubscription,
      sendConfirmationEmail = sendConfirmationEmail,
    )

  }

  def toSupporterPlusEmailData(
      request: AddSubscriptionRequest,
      plan: Plan,
      currency: Currency,
      paymentMethod: PaymentMethod,
      firstPaymentDate: LocalDate,
      contacts: Contacts,
      amountMinorUnits: AmountMinorUnits,
      currentDate: LocalDate,
  ) =
    SupporterPlusEmailData(
      accountId = request.zuoraAccountId,
      currency = currency,
      plan = plan,
      paymentMethod = paymentMethod,
      amountMinorUnits = amountMinorUnits,
      firstPaymentDate = firstPaymentDate,
      contacts = contacts,
      created = currentDate,
    )

  def getContributionAmount(totalAmount: AmountMinorUnits, currency: Currency, plan: Plan): AmountMinorUnits = {
    val subscriptionAmount = plan.paymentPlans(currency).amountMinorUnits.value
    AmountMinorUnits(totalAmount.value - subscriptionAmount)
  }

  def getValidatedSupporterPlusCustomerData(
      zuoraClient: Requests,
      supporterPlusPlanIds: List[ProductRatePlanId],
  ): ZuoraAccountId => ApiGatewayOp[SupporterPlusCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate SupporterPlusAccountValidation.apply _
    val getValidatedAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount] = GetAccount(zuoraClient.get[ZuoraAccount])(_).andValidateWith(
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod: GetAccount.PaymentMethodId => ApiGatewayOp[PaymentMethod] =
      GetPaymentMethod(zuoraClient.get[PaymentMethodWire])(_).andValidateWith(ValidatePaymentMethod.apply _)
    val validateSubs =
      ValidateSubscriptions(supporterPlusPlanIds, "Zuora account already has an active supporter plus subscription") _
    val getValidatedSubs: ZuoraAccountId => ApiGatewayOp[List[GetAccountSubscriptions.Subscription]] =
      GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse])(_).andValidateWith(validateSubs)
    val getContactsFromZuora = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getUnvalidatedContacts = getContactsFromZuora.andThen(_.toApiGatewayOp("getting contacts from Zuora"))
    GetSupporterPlusCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getUnvalidatedContacts,
      getAccountSubscriptions = getValidatedSubs,
      _,
    )
  }
}
