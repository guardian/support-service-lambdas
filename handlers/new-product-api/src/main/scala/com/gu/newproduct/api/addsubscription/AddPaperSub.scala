package com.gu.newproduct.api.addsubscription

import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.serialisers.PaperEmailDataSerialiser._
import com.gu.newproduct.api.addsubscription.email.{EtSqsSend, PaperEmailData, SendConfirmationEmail}
import com.gu.newproduct.api.addsubscription.validation.Validation._
import com.gu.newproduct.api.addsubscription.validation.paper.{GetPaperCustomerData, PaperAccountValidation, PaperCustomerData}
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.SoldToAddress
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethodWire
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{ProductRatePlanId, ZuoraIds}
import com.gu.newproduct.api.productcatalog.{NationalDeliveryPlanId, Plan, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.{ApiGatewayOp, OptionOps}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp

import java.time.LocalDate
import scala.concurrent.Future

class AddPaperSub(
  getPlan: PlanId => Plan,
  getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
  getCustomerData: ZuoraAccountId => ApiGatewayOp[PaperCustomerData],
  validateStartDate: (PlanId, LocalDate) => ValidationResult[Unit],
  validateAddress: (PlanId, SoldToAddress) => ValidationResult[Unit],
  createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
  sendConfirmationEmail: (Option[SfContactId], PaperEmailData) => AsyncApiGatewayOp[Unit],
) extends AddSpecificProduct {
  override def addProduct(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- validateStartDate(request.planId, request.startDate).toApiGatewayOp.toAsync
    _ <- ((request.planId, request.deliveryAgent) match {
      case (_: NationalDeliveryPlanId, Some(_)) => Passed(())
      case (_: NationalDeliveryPlanId, None) => Failed("delivery agent must ALWAYS be specified for national delivery")
      case (_, Some(_)) => Failed("delivery agent must ONLY be specified for national delivery")
      case (_, None) => Passed(())
    }).toApiGatewayOp.toAsync

    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    _ <- validateAddress(request.planId, customerData.contacts.soldTo.address).toApiGatewayOp.toAsync
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
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create paper subscription")
    plan = getPlan(request.planId)
    paperEmailData = PaperEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      firstPaperDate = request.startDate,
      subscriptionName = subscriptionName,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod,
      currency = customerData.account.currency,
      deliveryAgentDetails = None // TODO go out to PPR to get the agent info then pass in below
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, paperEmailData)
      .recoverAndLog("send paper confirmation email")
  } yield subscriptionName
}

object AddPaperSub {

  def wireSteps(
    catalog: Map[PlanId, Plan],
      zuoraIds: ZuoraIds,
      zuoraClient: Requests,
      isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
      isValidAddressForPlan: (PlanId, SoldToAddress) => ValidationResult[Unit],
      createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
      awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
      emailQueueName: QueueName,
  ): AddSpecificProduct = {
    val paperSqsQueueSend = awsSQSSend(emailQueueName)
    val paperBrazeConfirmationSqsSend = EtSqsSend[PaperEmailData](paperSqsQueueSend) _
    val sendConfirmationEmail = SendConfirmationEmail(paperBrazeConfirmationSqsSend) _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient)
    new AddPaperSub(
      catalog,
      zuoraIds.apiIdToRateplanId.get,
      validatedCustomerData,
      isValidStartDateForPlan,
      isValidAddressForPlan,
      createSubscription,
      sendConfirmationEmail,
    )
  }

  def getValidatedCustomerData(zuoraClient: Requests): ZuoraAccountId => ApiGatewayOp[PaperCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate PaperAccountValidation.apply _
    val getValidatedAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount] = GetAccount(zuoraClient.get[ZuoraAccount])(_).andValidateWith(
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod: GetAccount.PaymentMethodId => ApiGatewayOp[GetPaymentMethod.PaymentMethod] =
      GetPaymentMethod(zuoraClient.get[PaymentMethodWire])(_).andValidateWith(ValidatePaymentMethod.apply _)
    val getContacts: ZuoraAccountId => ClientFailableOp[GetContacts.Contacts] = GetContacts(
      zuoraClient.get[GetContactsResponse],
    ) _
    GetPaperCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getContacts,
      _,
    )
  }

}
