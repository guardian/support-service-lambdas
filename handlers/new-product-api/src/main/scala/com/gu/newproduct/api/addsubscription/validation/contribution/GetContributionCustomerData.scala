package com.gu.newproduct.api.addsubscription.validation.contribution

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp
case class ContributionCustomerData(
    account: ValidatedAccount,
    paymentMethod: PaymentMethod,
    accountSubscriptions: List[Subscription],
    contacts: Contacts,
)

object GetContributionCustomerData {
  def apply(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
      getContacts: ZuoraAccountId => ApiGatewayOp[Contacts],
      getAccountSubscriptions: ZuoraAccountId => ApiGatewayOp[List[Subscription]],
      accountId: ZuoraAccountId,
  ) = for {
    account <- getAccount(accountId)
    paymentMethod <- getPaymentMethod(account.paymentMethodId)
    accountSubscriptions <- getAccountSubscriptions(accountId)
    contacts <- getContacts(accountId)
  } yield ContributionCustomerData(account, paymentMethod, accountSubscriptions, contacts)

}
