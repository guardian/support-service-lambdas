package com.gu.newproduct.api.addsubscription

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.supporterplus.SupporterPlusValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.supporterplus._
import com.gu.newproduct.api.addsubscription.validation.{ValidateAccount, ValidatePaymentMethod, ValidateSubscriptions, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlySupporterPlus
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Catalog, Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp

import java.time.LocalDate

object AddSupporterPlus {
  def steps(
   getPlan: PlanId => Plan,
   getCurrentDate: () => LocalDate,
   getPlanAndCharge: PlanId => Option[PlanAndCharge],
   getCustomerData: ZuoraAccountId => ApiGatewayOp[SupporterPlusCustomerData],
   supporterPlusValidations: (SupporterPlusValidations.ValidatableFields, PlanId, Currency) => ValidationResult[AmountMinorUnits],
   createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName]
 )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = {
    for {
      customerData <- getCustomerData(request.zuoraAccountId).toAsync
      SupporterPlusCustomerData(account, paymentMethod, subscriptions, contacts) = customerData
      validatableFields = ValidatableFields(request.amountMinorUnits, request.startDate)
      amountMinorUnits <- supporterPlusValidations(validatableFields, request.planId, account.currency).toApiGatewayOp.toAsync
      acceptanceDate = request.startDate.plusDays(paymentDelayFor(paymentMethod))
      planAndCharge <- getPlanAndCharge(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!")).toAsync
      chargeOverride = ChargeOverride(Some(amountMinorUnits), planAndCharge.productRatePlanChargeId, None)
      zuoraCreateSubRequest = ZuoraCreateSubRequest(
        request = request,
        acceptanceDate = acceptanceDate,
        ratePlans = List(
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = planAndCharge.productRatePlanId,
            maybeChargeOverride = Some(chargeOverride)
          )
        )
      )
      subscriptionName <- createSubscription(zuoraCreateSubRequest).toAsyncApiGatewayOp("create monthly supporter plus")

    } yield subscriptionName
  }

  def wireSteps(
    catalog: Catalog,
    zuoraIds: ZuoraIds,
    zuoraClient: Requests,
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    currentDate: () => LocalDate
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {

    val planAndChargeForSupporterPlusPlanId = zuoraIds.apiIdToPlanAndCharge.get _
    val supporterPlusIds = List(zuoraIds.supporterPlusZuoraIds.monthly.productRatePlanId, zuoraIds.supporterPlusZuoraIds.annual.productRatePlanId)
    val getCustomerData = getValidatedSupporterPlusCustomerData(zuoraClient, supporterPlusIds)
    val isValidSupporterPlusStartDate = isValidStartDateForPlan(MonthlySupporterPlus, _: LocalDate)
    val validateRequest = SupporterPlusValidations(isValidSupporterPlusStartDate, AmountLimits.limitsFor) _

    AddSupporterPlus.steps(
      getPlan = catalog.planForId,
      getCurrentDate = currentDate,
      getPlanAndCharge = planAndChargeForSupporterPlusPlanId,
      getCustomerData = getCustomerData,
      supporterPlusValidations = validateRequest,
      createSubscription = createSubscription,
    ) _

  }

  def paymentDelayFor(paymentMethod: PaymentMethod): Long = paymentMethod match {
    case d: DirectDebit => 10l
    case _ => 0l
  }

  def getValidatedSupporterPlusCustomerData(
   zuoraClient: Requests,
   supporterPlusPlanIds: List[ProductRatePlanId]
  ): ZuoraAccountId => ApiGatewayOp[SupporterPlusCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate SupporterPlusAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val validateSubs = ValidateSubscriptions(supporterPlusPlanIds, "Zuora account already has an active supporter plus subscription") _
    val getValidatedSubs = GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _ andValidateWith validateSubs
    val getContactsFromZuora = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getUnvalidatedContacts = getContactsFromZuora.andThen(_.toApiGatewayOp("getting contacts from Zuora"))
    GetSupporterPlusCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getUnvalidatedContacts,
      getAccountSubscriptions = getValidatedSubs,
      _
    )
  }
}

