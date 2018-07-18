package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{Active, Closed, PaymentMethodStatus}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

class PrerequisiteCheckTest extends FlatSpec with Matchers {

  def validationError(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse(statusCode = "422", message = msg))

  it should "succeed with valid account" in {
    wiredPrerequisiteCheck(ZuoraAccountId("validAccount")) shouldBe ContinueProcessing(())
  }
  it should "fail if account cannot be loaded" in {
    wiredPrerequisiteCheck(ZuoraAccountId("wrongAccountId")) shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("something"))
  }
  it should "fail if account has no identity id" in {
    wiredPrerequisiteCheck(ZuoraAccountId("noIdentityAccount")) shouldBe validationError("Zuora account has no Identity Id")
  }
  it should "fail if account has no default payment method id" in {
    wiredPrerequisiteCheck(ZuoraAccountId("noPaymentAccount")) shouldBe validationError("Zuora account has no default payment method")
  }
  it should "fail if account has autopay disabled" in {
    wiredPrerequisiteCheck(ZuoraAccountId("noAutoPayAccount")) shouldBe validationError("Zuora account has autopay disabled")
  }
  it should "fail if payment method is disabled" in {
    wiredPrerequisiteCheck(ZuoraAccountId("disabledPaymentMethodAccount")) shouldBe validationError("Default payment method status in Zuora account is not active")
  }
  it should "fail if account balance is not zero" in {
    wiredPrerequisiteCheck(ZuoraAccountId("balanceNotZeroAccount")) shouldBe validationError("Zuora account balance is not zero")
  }
  it should "fail if account already has an active recurring contribution subscription" in {
    wiredPrerequisiteCheck(ZuoraAccountId("monthlyContributingAccount")) shouldBe validationError("Zuora account already has an active recurring contribution subscription")
  }

  def getAccount(id: ZuoraAccountId) = {

    val validAccount = Account(
      identityId = Some(IdentityId("idAccount1")),
      paymentMethodId = Some(PaymentMethodId("activePaymentMethod")),
      autoPay = AutoPay(true),
      accountBalanceMinorUnits = AccountBalanceMinorUnits(0)
    )
    val noIdentityAccount = validAccount.copy(identityId = None)
    val noPaymentAccount = validAccount.copy(paymentMethodId = None)
    val noAutoPayAccount = validAccount.copy(autoPay = AutoPay(false))
    val disabledPaymentAccount = validAccount.copy(paymentMethodId = Some(PaymentMethodId("disabled")))
    val balanceNotZeroAccount = validAccount.copy(accountBalanceMinorUnits = AccountBalanceMinorUnits(1000))

    val testAccounts = Map(
      "validAccount" -> validAccount,
      "noIdentityAccount" -> noIdentityAccount,
      "noPaymentAccount" -> noPaymentAccount,
      "noAutoPayAccount" -> noAutoPayAccount,
      "disabledPaymentMethodAccount" -> disabledPaymentAccount,
      "balanceNotZeroAccount" -> balanceNotZeroAccount,
      "monthlyContributingAccount" -> validAccount,
      "annualContributingAccount" -> validAccount
    )

    testAccounts.get(id.value).map(ClientSuccess(_)).getOrElse(GenericError("invalid account"))
  }

  def getPaymentMethodStatus(id: PaymentMethodId): ClientFailableOp[PaymentMethodStatus] = if (id.value == "activePaymentMethod") ClientSuccess(Active) else ClientSuccess(Closed)

  def getAccountSubscriptions(id: ZuoraAccountId) = {

    def sub(active: Boolean, rateplans: Set[String]) = Subscription(
      status = if (active) GetAccountSubscriptions.Active else GetAccountSubscriptions.NotActive,
      productRateplanIds = rateplans.map(ProductRatePlanId)
    )

    val validSubs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = false, rateplans = Set("monthlyRatePlanId", "someOtherPlan"))
    )

    val monthlySubs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("monthlyRatePlanId", "someOtherPlan"))
    )
    val annualSubs = List(
      sub(active = true, rateplans = Set("somePlan", "someOtherPlan")),
      sub(active = true, rateplans = Set("somethingElse", "anualRateplanId"))
    )
    val subsByAccount = Map(
      "validAccount" -> validSubs,
      "monthlyContributingAccount" -> monthlySubs,
      "annualContributingAccount" -> annualSubs
    )

    subsByAccount.get(id.value).map(ClientSuccess(_)).getOrElse(GenericError("invalid account"))
  }

  val wiredPrerequisiteCheck = PrerequesiteCheck(
    getAccount = getAccount,
    getPaymentMethodStatus = getPaymentMethodStatus,
    contributionRatePlanIds = List(ProductRatePlanId("anualRateplanId"), ProductRatePlanId("monthlyRatePlanId")),
    getAccountSubscriptions = getAccountSubscriptions
  ) _
}
