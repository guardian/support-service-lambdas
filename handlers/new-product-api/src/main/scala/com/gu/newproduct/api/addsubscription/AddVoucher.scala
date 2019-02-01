package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.EmailQueueNames
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.EtSqsSend
import com.gu.newproduct.api.addsubscription.email.voucher.{SendConfirmationEmailVoucher, VoucherEmailData}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.voucher.{GetVoucherCustomerData, ValidateContactsForVoucher, VoucherAccountValidation, VoucherCustomerData}
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

object AddVoucher {
  def steps(
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
    createSubRequest = ZuoraCreateSubRequest(
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
    val voucherSqsSend = awsSQSSend(emailQueueNames.voucher)
    val voucherEtSqsSend = EtSqsSend[VoucherEmailData](voucherSqsSend) _
    val sendVoucherEmail = SendConfirmationEmailVoucher(voucherEtSqsSend, currentDate) _
    val getZuoraIdForVoucherPlan = zuoraIds.voucherZuoraIds.byApiPlanId.get _
    val getVoucherData = getValidatedVoucherCustomerData(zuoraClient)
    steps(
      catalog.planForId,
      getZuoraIdForVoucherPlan,
      getVoucherData,
      isValidStartDateForPlan,
      createSubscription,
      sendVoucherEmail
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

}
