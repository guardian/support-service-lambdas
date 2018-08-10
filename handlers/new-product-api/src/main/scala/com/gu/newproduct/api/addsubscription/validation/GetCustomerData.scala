package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{Account, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.Contact
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.resthttp.Types.ClientFailableOp

case class CustomerData(
  account: ValidatedAccount,
  paymentMethod: PaymentMethod,
  accountSubscriptions: List[Subscription],
  billToContact: Contact
)

object GetCustomerData {
    def apply(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
      getBilltoContact: ZuoraAccountId => ApiGatewayOp[Contact],
      getAccountSubscriptions: ZuoraAccountId =>ApiGatewayOp[List[Subscription]],
      accountId: ZuoraAccountId) = for {
      account <- getAccount(accountId)
      paymentMethod <- getPaymentMethod(account.paymentMethodId)
      accountSubscriptions <- getAccountSubscriptions(accountId)
      billToContact <- getBilltoContact(accountId)
    } yield CustomerData(account, paymentMethod, accountSubscriptions, billToContact)

}

