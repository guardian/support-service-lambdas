package com.gu.newproduct.api.addsubscription.validation.digipack

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.Subscription
case class DigipackCustomerData(
    account: ValidatedAccount,
    paymentMethod: PaymentMethod,
    contacts: Contacts,
    subscriptions: List[Subscription],
)

object GetDigipackCustomerData {
  def apply(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
      getAccountSubscriptions: ZuoraAccountId => ApiGatewayOp[List[Subscription]],
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
      getContacts: ZuoraAccountId => ClientFailableOp[Contacts],
      accountId: ZuoraAccountId,
  ) = for {
    account <- getAccount(accountId)
    accountSubscriptions <- getAccountSubscriptions(accountId)
    paymentMethod <- getPaymentMethod(account.paymentMethodId)
    contacts <- getContacts(accountId).toApiGatewayOp("get contacts")
  } yield DigipackCustomerData(account, paymentMethod, contacts, accountSubscriptions)

}
