package com.gu.newproduct.api.addsubscription

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.serialisers.DigipackEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.digipack.ValidatedAddress
import com.gu.newproduct.api.addsubscription.email.{DigipackEmailData, EtSqsSend, SendConfirmationEmail, TrialPeriod}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.digipack.{DigipackAccountValidation, DigipackCustomerData, GetDigipackCustomerData}
import com.gu.newproduct.api.addsubscription.validation.{ValidateAccount, ValidatePaymentMethod, ValidateSubscriptions, ValidatedAccount, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.WireModel.ZuoraSubscriptionsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BillToAddress
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethodWire
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetAccountSubscriptions, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp

import java.time.LocalDate
import java.time.temporal.ChronoUnit.DAYS
import scala.concurrent.Future

class AddDigipackSub(
  currentDate: () => LocalDate,
  getPlan: PlanId => Plan,
  getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
  getCustomerData: ZuoraAccountId => ApiGatewayOp[DigipackCustomerData],
  isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
  validateAddress: BillToAddress => ValidationResult[ValidatedAddress],
  createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
  sendConfirmationEmail: (Option[SfContactId], DigipackEmailData) => AsyncApiGatewayOp[Unit],
) extends AddSpecificProduct {
  override def addProduct(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- isValidStartDateForPlan(request.planId, request.startDate).toApiGatewayOp.toAsync

    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    _ <- validateAddress(
      customerData.contacts.billTo.address,
    ).toApiGatewayOp.toAsync // todo refactor to use the validated version of the address ?
    zuoraRatePlanId <- getZuoraRateplanId(request.planId)
      .toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!"))
      .toAsync
    ratePlans = request.discountRatePlanId
      .map(id =>
        List(
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = id,
            maybeChargeOverride = None,
          ),
          ZuoraCreateSubRequestRatePlan(
            maybeChargeOverride = None,
            productRatePlanId = zuoraRatePlanId,
          ),
        ),
      )
      .getOrElse(
        List(
          ZuoraCreateSubRequestRatePlan(
            maybeChargeOverride = None,
            productRatePlanId = zuoraRatePlanId,
          ),
        ),
      )

    createSubRequest = ZuoraCreateSubRequest(
      request = request,
      acceptanceDate = request.startDate,
      ratePlans = ratePlans,
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
}

object AddDigipackSub {

  def wireSteps(
      catalog: Map[PlanId, Plan],
      zuoraIds: ZuoraIds,
      zuoraClient: Requests,
      isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
      isValidAddress: BillToAddress => ValidationResult[ValidatedAddress],
      createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
      awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
      emailQueueName: QueueName,
      currentDate: () => LocalDate,
  ): AddSpecificProduct = {

    val digipackPlanIds = zuoraIds.digitalPackIds.byApiPlanId.values.toList
    val digipackSqsSend = awsSQSSend(emailQueueName)
    val digiPackBrazeConfirmationSqsSend = EtSqsSend[DigipackEmailData](digipackSqsSend) _
    val sendConfirmationEmail = SendConfirmationEmail(digiPackBrazeConfirmationSqsSend) _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient, digipackPlanIds)
    new AddDigipackSub(
      currentDate,
      catalog,
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

    val validateAccount: GetAccount.Account => ValidationResult[ValidatedAccount] = (ValidateAccount.apply _).thenValidate(DigipackAccountValidation.apply)
    val getValidatedAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount] = GetAccount(zuoraClient.get[ZuoraAccount])(_).andValidateWith(
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod: GetAccount.PaymentMethodId => ApiGatewayOp[GetPaymentMethod.PaymentMethod] =
      GetPaymentMethod(zuoraClient.get[PaymentMethodWire])(_).andValidateWith(ValidatePaymentMethod.apply)
    val getContacts: ZuoraAccountId => ClientFailableOp[GetContacts.Contacts] = GetContacts(
      zuoraClient.get[GetContactsResponse],
    )
    val validateSubs =
      ValidateSubscriptions(plansWithDigipack, "Zuora account already has an active Digital Pack subscription") _
    val getValidatedSubs: ZuoraAccountId => ApiGatewayOp[List[GetAccountSubscriptions.Subscription]] =
      GetAccountSubscriptions(zuoraClient.get[ZuoraSubscriptionsResponse])(_).andValidateWith(validateSubs)

    GetDigipackCustomerData(
      getAccount = getValidatedAccount,
      getAccountSubscriptions = getValidatedSubs,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getContacts,
      _,
    )
  }

}
