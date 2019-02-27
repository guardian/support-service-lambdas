package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.EmailQueueNames
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.digipack.{DigipackEmailData, SendDigipackConfirmationEmail}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.paper.{GetPaperCustomerData, PaperAccountValidation, PaperCustomerData}
import com.gu.newproduct.api.addsubscription.validation.{ValidateAccount, ValidatePaymentMethod, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.BillToAddress
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

object AddDigipackSub {
  def steps(
    getPlan: PlanId => Plan,
    getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
    getCustomerData: ZuoraAccountId => ApiGatewayOp[PaperCustomerData],
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    validateAddress: BillToAddress => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (Option[SfContactId], DigipackEmailData) => AsyncApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- isValidStartDateForPlan(request.planId, request.startDate).toApiGatewayOp.toAsync

    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    _ <- validateAddress(customerData.contacts.billTo.address).toApiGatewayOp.toAsync
    zuoraRatePlanId <- getZuoraRateplanId(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!")).toAsync
    createSubRequest = ZuoraCreateSubRequest(
      request = request,
      acceptanceDate = request.startDate,
      chargeOverride = None,
      productRatePlanId = zuoraRatePlanId
    )
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create digiPack subscription")
    plan = getPlan(request.planId)
    paperEmailData = DigipackEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      firstPaperDate = request.startDate,
      subscriptionName = subscriptionName,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod,
      currency = customerData.account.currency
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, paperEmailData).recoverAndLog("send digiPack confirmation email")
  } yield subscriptionName

  def wireSteps(
    catalog: Catalog,
    zuoraIds: ZuoraIds,
    zuoraClient: Requests,
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    isValidAddress: BillToAddress => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    emailQueueNames: EmailQueueNames
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {
    val digipackSqsSend = awsSQSSend(emailQueueNames.paper)
    val digiPackBrazeConfirmationSqsSend = EtSqsSend[DigipackEmailData](digipackSqsSend) _
    val sendConfirmationEmail = SendDigipackConfirmationEmail(digiPackBrazeConfirmationSqsSend) _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient)
    steps(
      catalog.planForId,
      zuoraIds.apiIdToRateplanId.get,
      validatedCustomerData,
      isValidStartDateForPlan,
      isValidAddress,
      createSubscription,
      sendConfirmationEmail
    )
  }

  def getValidatedCustomerData(zuoraClient: Requests): ZuoraAccountId => ApiGatewayOp[PaperCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate PaperAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val getContacts: ZuoraAccountId => ClientFailableOp[GetContacts.Contacts] = GetContacts(zuoraClient.get[GetContactsResponse]) _
    GetPaperCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getContacts,
      _
    )
  }

}
