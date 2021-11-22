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
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.GetContactsResponse
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethodWire
import com.gu.newproduct.api.addsubscription.zuora.{GetAccount, GetContacts, GetPaymentMethod}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanId, ZuoraIds}
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
    getPlanAndCharge: PlanId => Option[PlanAndCharge],
    getCustomerData: ZuoraAccountId => ApiGatewayOp[GuardianWeeklyCustomerData],
    validateStartDate: (PlanId, LocalDate) => ValidationResult[Unit],
    validateAddress: (BillToAddress, SoldToAddress) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    sendConfirmationEmail: (Option[SfContactId], GuardianWeeklyEmailData) => AsyncApiGatewayOp[Unit],
    sixForSixPlanId: PlanId,
    quarterlyPlanId: PlanId
  )(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] = for {
    _ <- validateStartDate(request.planId, request.startDate).toApiGatewayOp.toAsync

    customerData <- getCustomerData(request.zuoraAccountId).toAsync
    _ <- validateAddress(customerData.contacts.billTo.address, customerData.contacts.soldTo.address).toApiGatewayOp.toAsync
    createSubRequest <- createCreateSubRequest(
      request,
      sixForSixPlanId,
      quarterlyPlanId,
      getZuoraRateplanId,
      getPlanAndCharge
    ).toAsync
    subscriptionName <- createSubscription(createSubRequest).toAsyncApiGatewayOp("create guardian weekly subscription")
    plan = getPlan(request.planId)
    guardianWeeklyEmailData = GuardianWeeklyEmailData(
      plan = plan,
      firstPaymentDate = request.startDate,
      contacts = customerData.contacts,
      paymentMethod = customerData.paymentMethod,
      currency = customerData.account.currency,
      subscriptionName = subscriptionName
    )
    _ <- sendConfirmationEmail(customerData.account.sfContactId, guardianWeeklyEmailData).recoverAndLog("send guardian weekly confirmation email")
  } yield subscriptionName

  def wireSteps(
    catalog: Catalog,
    zuoraIds: ZuoraIds,
    zuoraClient: Requests,
    isValidStartDateForPlan: (PlanId, LocalDate) => ValidationResult[Unit],
    isValidAddressForPlan: (BillToAddress, SoldToAddress) => ValidationResult[Unit],
    createSubscription: ZuoraCreateSubRequest => ClientFailableOp[SubscriptionName],
    awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
    emailQueueNames: EmailQueueNames,
    sixForSixPlanId: PlanId,
    quarterlyPlanId: PlanId
  ): AddSubscriptionRequest => AsyncApiGatewayOp[SubscriptionName] = {
    val guardianWeeklySqsQueueSend = awsSQSSend(emailQueueNames.guardianWeekly)
    val guardianWeeklyBrazeConfirmationSqsSend = EtSqsSend[GuardianWeeklyEmailData](guardianWeeklySqsQueueSend) _
    val sendConfirmationEmail = SendConfirmationEmail(guardianWeeklyBrazeConfirmationSqsSend) _
    val validatedCustomerData = getValidatedCustomerData(zuoraClient)
    steps(
      catalog.planForId,
      zuoraIds.apiIdToRateplanId.get,
      zuoraIds.apiIdToPlanAndCharge.get,
      validatedCustomerData,
      isValidStartDateForPlan,
      isValidAddressForPlan,
      createSubscription,
      sendConfirmationEmail,
      sixForSixPlanId,
      quarterlyPlanId
    )
  }

  def getValidatedCustomerData(zuoraClient: Requests): ZuoraAccountId => ApiGatewayOp[GuardianWeeklyCustomerData] = {

    val validateAccount = ValidateAccount.apply _ thenValidate GuardianWeeklyAccountValidation.apply _
    val getValidatedAccount = GetAccount(zuoraClient.get[ZuoraAccount]) _ andValidateWith (
      validate = validateAccount,
      ifNotFoundReturn = Some("Zuora account id is not valid")
    )
    val getValidatedPaymentMethod = GetPaymentMethod(zuoraClient.get[PaymentMethodWire]) _ andValidateWith ValidatePaymentMethod.apply _
    val getContacts: ZuoraAccountId => ApiGatewayOp[GetContacts.Contacts] = GetContacts(zuoraClient.get[GetContactsResponse]) _ andThen (_.toApiGatewayOp("getting contacts from Zuora"))

    GetGuardianWeeklyCustomerData(
      getAccount = getValidatedAccount,
      getPaymentMethod = getValidatedPaymentMethod,
      getContacts = getContacts,
      _
    )
  }

  def createCreateSubRequest(
    request: AddSubscriptionRequest,
    sixForSixPlanId: PlanId,
    quarterlyPlanId: PlanId,
    getZuoraRateplanId: PlanId => Option[ProductRatePlanId],
    getPlanAndCharge: PlanId => Option[PlanAndCharge]
  ): ApiGatewayOp[ZuoraCreateSubRequest] = {
    if (request.planId == sixForSixPlanId) {
      for {
        zuora6for6RatePlanAndCharge <- getPlanAndCharge(sixForSixPlanId)
          .toApiGatewayContinueProcessing(internalServerError(s"no Zuora ids for ${request.planId}!"))
        zuoraQuarterlyRatePlanId <- getZuoraRateplanId(quarterlyPlanId)
          .toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${quarterlyPlanId}!"))

        /**
         * The following logic was implement for consistency with the support-frontend:
         * https://github.com/guardian/support-frontend/blob/main/support-workers/src/main/scala/com/gu/zuora/ProductSubscriptionBuilders.scala
         *
         * 6 for 6 subs are modeled in zuora as a sub with two rate plans.
         * The inital 6 week period is given a 'trigger date' of the first issue date selected by the user.
         * After the initial 6 weeks the normal 3 quarterly subscription is used. This is triggered by the
         * contractAcceptanceDate which in this case is pushed forward by 6 weeks to avoid running concurrently
         * with the 6 for 6 period
         */
        createSubRequest = ZuoraCreateSubRequest(
          request = request,
          acceptanceDate = request.startDate.plusWeeks(7), // revert after christmas 2021 BEFORE reverting the zuora catalog changes https://github.com/guardian/support-frontend/pull/3319
          ratePlans = List(
            ZuoraCreateSubRequestRatePlan(
              productRatePlanId = zuora6for6RatePlanAndCharge.productRatePlanId,
              maybeChargeOverride = Some(ChargeOverride(
                amountMinorUnits = None,
                productRatePlanChargeId = zuora6for6RatePlanAndCharge.productRatePlanChargeId,
                triggerDate = Some(request.startDate)
              ))
            ),
            ZuoraCreateSubRequestRatePlan(
              productRatePlanId = zuoraQuarterlyRatePlanId,
              maybeChargeOverride = None
            )
          )
        )
      } yield createSubRequest
    } else {
      for {
        zuoraRatePlanId <- getZuoraRateplanId(request.planId).toApiGatewayContinueProcessing(internalServerError(s"no Zuora id for ${request.planId}!"))
        createSubRequest = ZuoraCreateSubRequest(
          request = request,
          acceptanceDate = request.startDate,
          ratePlans = List(
            ZuoraCreateSubRequestRatePlan(
              productRatePlanId = zuoraRatePlanId,
              maybeChargeOverride = None
            )
          )
        )
      } yield createSubRequest
    }
  }
}
