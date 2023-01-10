package com.gu.newproduct.api.addsubscription.validation.paper

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.newproduct.api.addsubscription.TypeConvert._
case class PaperCustomerData(
    account: ValidatedAccount,
    paymentMethod: PaymentMethod,
    contacts: Contacts,
)

object GetPaperCustomerData {
  def apply(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
      getContacts: ZuoraAccountId => ClientFailableOp[Contacts],
      accountId: ZuoraAccountId,
  ) = for {
    account <- getAccount(accountId)
    paymentMethod <- getPaymentMethod(account.paymentMethodId)
    contacts <- getContacts(accountId).toApiGatewayOp("get contacts")
  } yield PaperCustomerData(account, paymentMethod, contacts)

}
