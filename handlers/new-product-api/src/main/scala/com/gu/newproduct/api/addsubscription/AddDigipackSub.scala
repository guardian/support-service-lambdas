package com.gu.newproduct.api.addsubscription

import java.time.LocalDate
import java.time.temporal.ChronoUnit.DAYS

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.EmailQueueNames
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.digipack.DigipackEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.digipack.ValidatedAddress
import com.gu.newproduct.api.addsubscription.email.{DigipackEmailData, EtSqsSend, SendConfirmationEmail, TrialPeriod}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.digipack.{
  DigipackAccountValidation,
  DigipackCustomerData,
  GetDigipackCustomerData,
}
import com.gu.newproduct.api.addsubscription.validation.{
  ValidateAccount,
  ValidatePaymentMethod,
  ValidateSubscriptions,
  ValidationResult,
}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{
  SubscriptionName,
  ZuoraCreateSubRequest,
  ZuoraCreateSubRequestRatePlan,
}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BillToAddress
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethodWire
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{Catalog, Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp

import scala.concurrent.Future
object AddDigipackSub {
  def steps(
      currentDate: () => LocalDate,
      getPlan: PlanId => Plan,
      getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
      getCustomerData: ZuoraAccountId => ApiGatewayOp[DigipackCustomerData],
      isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
      validateAddress: BillToAddress => ValidationResult[ValidatedAddress],
      createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
      sendConfirmationEmail: (Option[SfContactId], DigipackEmailData) => AsyncApiGatewayOp[Unit],
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- isValidStartDateForPlan(request.planId, request.startDate).toApiGatewayOp.toAsync

    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    _ <- validateAddress(
      customerData.contacts.billTo.address,
    ).toApiGatewayOp.toAsync // todo refactor to use the validated version of the address ?
    zuoraRatePlanId <- getZuoraRateplanId(request.planId)
      .toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!"))
      .toAsync
    createSubRequest = ZuoraCreateSubRequest(
      request = request,
      acceptanceDate = request.startDate,
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          maybeChargeOverride = None,
          productRatePlanId = zuoraRatePlanId,
        ),
      ),
    )
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create digiPack subscription")
    plan = getPlan(request.planId)
    trialPeriodDays = DAYS.between(currentDate(), request.startDate).toInt
    emailData = DigipackEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      subscriptionName = subscriptionName,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod,
      currency = customerData.account.currency,
      trialPeriod = TrialPeriod(days = trialPeriodDays),
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, emailData)
      .recoverAndLog("send digiPack confirmation email")
  } yield subscriptionName

  def wireSteps(
      catalog: Catalog,
      zuoraIds: ZuoraIds,
      zuoraClient: Requests,
      isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
      isValidAddress: BillToAddress => ValidationResult[ValidatedAddress],
      createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
      awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
      emailQueueNames: EmailQueueNames,
      currentDate: () => LocalDate,
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {

    val digipackPlanIds = zuoraIds.digitalPackIds.byApiPlanId.values.toList
    val digipackSqsSend = awsSQSSend(emailQueueNames.digipack)
    val digiPackBrazeConfirmationSqsSend = EtSqsSend[DigipackEmailData](digipackSqsSend) _
    val sendConfirmationEmail = SendConfirmationEmail(digiPackBrazeConfirmationSqsSend) _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient, digipackPlanIds)
    steps(
      currentDate,
      catalog.planForId,
      zuoraIds.apiIdToRateplanId.get,
      validatedCustomerData,
      isValidStartDateForPlan,
      isValidAddress,
      createSubscription,
      sendConfirmationEmail,
    )
  }

  def getValidatedCustomerData(
      zuoraClient: Requests,
      plansWithDigipack: List[ProductRatePlanId],
  ): ZuoraAccountId => ApiGatewayOp[DigipackCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate DigipackAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod =
      GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val getContacts: ZuoraAccountId => ClientFailableOp[GetContacts.Contacts] = GetContacts(
      zuoraClient.get[GetContactsResponse],
    ) _
    val validateSubs =
      ValidateSubscriptions(plansWithDigipack, "Zuora account already has an active Digital Pack subscription") _
    val getValidatedSubs =
      GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse]) _ andValidateWith validateSubs

    GetDigipackCustomerData(
      getAccount = getValidatedAccount,
      getAccountSubscriptions = getValidatedSubs,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getContacts,
      _,
    )
  }

}
