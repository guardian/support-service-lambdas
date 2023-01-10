package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.Contacts
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp
case class GuardianWeeklyCustomerData(
    account: ValidatedAccount,
    paymentMethod: PaymentMethod,
    contacts: Contacts,
)

object GetGuardianWeeklyCustomerData {
  def apply(
      getAccount: ZuoraAccountId => ApiGatewayOp[ValidatedAccount],
      getPaymentMethod: PaymentMethodId => ApiGatewayOp[PaymentMethod],
      getContacts: ZuoraAccountId => ApiGatewayOp[Contacts],
      accountId: ZuoraAccountId,
  ) = for {
    account <- getAccount(accountId)
    paymentMethod <- getPaymentMethod(account.paymentMethodId)
    contacts <- getContacts(accountId)
  } yield GuardianWeeklyCustomerData(account, paymentMethod, contacts)

}
