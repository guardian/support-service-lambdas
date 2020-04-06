package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.EmailQueueNames
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.guardianweekly.GuardianWeeklyEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.{EtSqsSend, GuardianWeeklyEmailData, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.{GetGuardianWeeklyCustomerData, GuardianWeeklyAccountValidation, GuardianWeeklyCustomerData}
import com.gu.newproduct.api.addsubscription.validation.{ValidateAccount, ValidatePaymentMethod, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethodWire
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{Catalog, Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes.{AsyncApiGatewayOp, _}
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp

import scala.concurrent.Future

object AddGuardianWeeklySub {
  def steps(
    getPlan: PlanId => Plan,
    getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
    getCustomerData: ZuoraAccountId => ApiGatewayOp[GuardianWeeklyCustomerData],
    validateStartDate: (PlanId, LocalDate) => ValidationResult[Unit],
    validateAddress: (BillToAddress, SoldToAddress) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (Option[SfContactId], GuardianWeeklyEmailData) => AsyncApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- validateStartDate(request.planId, request.startDate).toApiGatewayOp.toAsync

    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    _ <- validateAddress(customerData.contacts.billTo.address, customerData.contacts.soldTo.address).toApiGatewayOp.toAsync
    zuoraRatePlanId <- getZuoraRateplanId(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!")).toAsync
    createSubRequest = ZuoraCreateSubRequest(
      request = request,
      acceptanceDate = request.startDate,
      chargeOverride = None,
      productRatePlanId = zuoraRatePlanId
    )
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create paper subscription")
    plan = getPlan(request.planId)
    paperEmailData = GuardianWeeklyEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod,
      currency = customerData.account.currency
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, paperEmailData).recoverAndLog("send paper confirmation email")
  } yield subscriptionName

  def wireSteps(
    catalog: Catalog,
    zuoraIds: ZuoraIds,
    zuoraClient: Requests,
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    isValidAddressForPlan: (BillToAddress, SoldToAddress) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    emailQueueNames: EmailQueueNames
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {
    val paperSqsQueueSend = awsSQSSend(emailQueueNames.paper)
    val paperBrazeConfirmationSqsSend = EtSqsSend[GuardianWeeklyEmailData](paperSqsQueueSend) _
    val sendConfirmationEmail = SendConfirmationEmail(paperBrazeConfirmationSqsSend) _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient)
    steps(
      catalog.planForId,
      zuoraIds.apiIdToRateplanId.get,
      validatedCustomerData,
      isValidStartDateForPlan,
      isValidAddressForPlan,
      createSubscription,
      sendConfirmationEmail
    )
  }

  def getValidatedCustomerData(zuoraClient: Requests): ZuoraAccountId => ApiGatewayOp[GuardianWeeklyCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate GuardianWeeklyAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val getContacts: ZuoraAccountId => ApiGatewayOp[GetContacts.Contacts] = GetContacts(zuoraClient.get[GetContactsResponse]) _ andThen(_.toApiGatewayOp("getting contacts from Zuora"))

    GetGuardianWeeklyCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getContacts,
      _
    )
  }

}
