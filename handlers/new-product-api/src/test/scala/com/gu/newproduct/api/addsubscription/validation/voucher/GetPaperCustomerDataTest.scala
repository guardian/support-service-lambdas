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
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetPaperCustomerDataTest extends AnyFlatSpec with Matchers {

  "GetVoucherCustomerData" should "return data succesfully" in {
    val actual = getPaperCustomerData(
      accountId = ZuoraAccountId("TestAccountId"),
    )

    actual shouldBe ContinueProcessing(
      PaperCustomerData(
        TestData.validatedAccount,
        TestData.directDebitPaymentMethod,
        TestData.contacts,
      ),
    )
  }

  it should "return error if get account fails" in {

    val actual = getPaperCustomerData(
      getAccount = failedCall,
      accountId = ZuoraAccountId("TestAccountId"),
    )
    actual shouldBe errorResponse
  }

  it should "return error if get payment method fails" in {

    val actual = getPaperCustomerData(
      getPaymentMethod = failedPaymentMethodCall,
      accountId = ZuoraAccountId("TestAccountId"),
    )
    actual shouldBe errorResponse
  }

  it should "return error if get contacts fails" in {

    val actual = getPaperCustomerData(
      getContacts = _ => GenericError("something failed!"),
      accountId = ZuoraAccountId("TestAccountId"),
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
    ClientSuccess(TestData.contacts)
  }

  def getPaperCustomerData(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount] = getAccountSuccess,
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod] = getPaymentMethodSuccess,
      getContacts: ZuoraAccountId => ClientFailableOp[Contacts] = getContactsSuccess,
      accountId: ZuoraAccountId,
  ) = GetPaperCustomerData(
    getAccount,
    getPaymentMethod,
    getContacts,
    accountId,
  )
}
