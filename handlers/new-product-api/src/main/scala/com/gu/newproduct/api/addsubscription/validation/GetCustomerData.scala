package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp
case class CustomerData(
  account: ValidatedAccount,
  paymentMethod: PaymentMethod,
  accountSubscriptions: List[Subscription], //todo we should probably come up with a different object or something for voucher since we don't need the extra call to get subs
  contacts: Contacts
)

object GetCustomerData {
  def apply(
    getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
    getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
    getContacts: ZuoraAccountId => ApiGatewayOp[Contacts],
    getAccountSubscriptions: ZuoraAccountId => ApiGatewayOp[List[Subscription]],
    accountId: ZuoraAccountId
  ) = for {
    account <- getAccount(accountId)
    paymentMethod <- getPaymentMethod(account.paymentMethodId)
    accountSubscriptions <- getAccountSubscriptions(accountId)
    contacts <- getContacts(accountId)
  } yield CustomerData(account, paymentMethod, accountSubscriptions, contacts)

}

