package com.gu.newproduct.api.addsubscription.validation.supporterplus

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp

case class SupporterPlusCustomerData(
    account: ValidatedAccount,
    paymentMethod: PaymentMethod,
    accountSubscriptions: List[Subscription],
    contacts: Contacts,
)

object GetSupporterPlusCustomerData {
  def apply(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
      getContacts: ZuoraAccountId => ApiGatewayOp[Contacts],
      getAccountSubscriptions: ZuoraAccountId => ApiGatewayOp[List[Subscription]],
      accountId: ZuoraAccountId,
  ) = {
    // put futures into vals so they all kick off in advance of the for comprehension
    val eventualAccount = getAccount(accountId)
    val eventualSubscriptions = getAccountSubscriptions(accountId)
    val eventualContacts = getContacts(accountId)
    for {
      account <- eventualAccount
      paymentMethod <- getPaymentMethod(account.paymentMethodId)
      accountSubscriptions <- eventualSubscriptions
      contacts <- eventualContacts
    } yield SupporterPlusCustomerData(account, paymentMethod, accountSubscriptions, contacts)
  }

}
