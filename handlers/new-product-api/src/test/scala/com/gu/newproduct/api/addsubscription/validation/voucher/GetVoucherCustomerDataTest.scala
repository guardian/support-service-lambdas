package com.gu.newproduct.api.addsubscription.validation.voucher

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.validation.paper.{GetPaperCustomerData, PaperCustomerData}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.{FlatSpec, Matchers}

class GetVoucherCustomerDataTest extends FlatSpec with Matchers {

  "GetVoucherCustomerData" should "return data succesfully" in {
    val actual = getVoucherCustomerData(
      accountId = ZuoraAccountId("TestAccountId")
    )

    actual shouldBe ContinueProcessing(PaperCustomerData(
      TestData.validatedAccount,
      TestData.directDebitPaymentMethod,
      TestData.contacts
    ))
  }

  it should "return error if get account fails" in {

    val actual = getVoucherCustomerData(
      getAccount = failedCall,
      accountId = ZuoraAccountId("TestAccountId")
    )
    actual shouldBe errorResponse
  }

  it should "return error if get payment method fails" in {

    val actual = getVoucherCustomerData(
      getPaymentMethod = failedPaymentMethodCall,
      accountId = ZuoraAccountId("TestAccountId")
    )
    actual shouldBe errorResponse
  }

  it should "return error if get contacts fails" in {

    val actual = getVoucherCustomerData(
      getContacts = failedCall,
      accountId = ZuoraAccountId("TestAccountId")
    )
    actual shouldBe errorResponse
  }

  val errorResponse = ReturnWithResponse(ApiGatewayResponse.internalServerError("error"))
  def failedCall(accountId: ZuoraAccountId) = errorResponse
  def failedPaymentMethodCall(paymentMethodId: PaymentMethodId) = errorResponse

  def getAccountSuccess(accountId: ZuoraAccountId) = {
    accountId shouldBe ZuoraAccountId("TestAccountId")
    ContinueProcessing(TestData.validatedAccount)
  }

  def getPaymentMethodSuccess(paymentMethodId: PaymentMethodId) = {
    paymentMethodId shouldBe PaymentMethodId("paymentMethodId")
    ContinueProcessing(TestData.directDebitPaymentMethod)
  }

  def getAccountSubscriptionsSuccess(accountId: ZuoraAccountId) = {
    accountId shouldBe ZuoraAccountId("TestAccountId")
    ContinueProcessing(TestData.subscriptionList)
  }

  def getContactsSuccess(accountId: ZuoraAccountId) = {
    accountId shouldBe ZuoraAccountId("TestAccountId")
    ContinueProcessing(TestData.contacts)
  }

  def getVoucherCustomerData(
    getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount] = getAccountSuccess,
    getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod] = getPaymentMethodSuccess,
    getContacts: ZuoraAccountId => ApiGatewayOp[Contacts] = getContactsSuccess,
    accountId: ZuoraAccountId
  ) = GetPaperCustomerData(
    getAccount,
    getPaymentMethod,
    getContacts,
    accountId
  )
}
