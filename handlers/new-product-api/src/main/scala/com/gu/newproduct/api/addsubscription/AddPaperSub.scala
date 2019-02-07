package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.EmailQueueNames
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.paper.{SendPaperConfirmationEmail, PaperEmailData}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.paper.{GetPaperCustomerData, PaperCustomerData, ValidateContactsForPaper}
import com.gu.newproduct.api.addsubscription.validation.voucher.PaperAccountValidation
import com.gu.newproduct.api.addsubscription.validation.{ValidateAccount, ValidatePaymentMethod, ValidationResult}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
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

object AddPaperSub {
  def steps(
    getPlan: PlanId => Plan,
    getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
    getCustomerData: ZuoraAccountId => ApiGatewayOp[PaperCustomerData],
    validateStartDate: (PlanId, LocalDate) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (Option[SfContactId], PaperEmailData) => AsyncApiGatewayOp[Unit]
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- validateStartDate(request.planId, request.startDate).toApiGatewayOp.toAsync
    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    zuoraRatePlanId <- getZuoraRateplanId(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!")).toAsync
    createSubRequest = ZuoraCreateSubRequest(
      request = request,
      acceptanceDate = request.startDate,
      chargeOverride = None,
      productRatePlanId = zuoraRatePlanId
    )
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create voucher subscription")
    plan = getPlan(request.planId)
    voucherEmailData = PaperEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      firstPaperDate = request.startDate,
      subscriptionName = subscriptionName,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, voucherEmailData).recoverAndLog("send voucher confirmation email")
  } yield subscriptionName

  def wireSteps(
    catalog: Catalog,
    zuoraIds: ZuoraIds,
    zuoraClient: Requests,
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    emailQueueNames: EmailQueueNames
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {
    val paperSqsQueueSend = awsSQSSend(emailQueueNames.paper)
    val paperBrazeConfirmationSqsSend = EtSqsSend[PaperEmailData](paperSqsQueueSend) _
    val sendConfirmationEmail = SendPaperConfirmationEmail(paperBrazeConfirmationSqsSend) _
    val getZuoraIdForPaperPlan = (zuoraIds.voucherZuoraIds.byApiPlanId ++ zuoraIds.homeDeliveryZuoraIds.byApiPlanId).get _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient)
    steps(
      catalog.planForId,
      getZuoraIdForPaperPlan,
      validatedCustomerData,
      isValidStartDateForPlan,
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
    val getContacts = GetContacts(zuoraClient.get[GetContactsResponse]) _
    val getValidatedContacts = getContacts andValidateWith (ValidateContactsForPaper.apply _)
    GetPaperCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getValidatedContacts,
      _
    )
  }

}
