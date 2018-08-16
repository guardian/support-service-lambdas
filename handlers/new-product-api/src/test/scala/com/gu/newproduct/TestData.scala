package com.gu.newproduct

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{AccountBalanceMinorUnits, AutoPay, IdentityId, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.NonDirectDebitMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard

object TestData {

  val validatedAccount = ValidatedAccount(
    Some(IdentityId("identityId")),
    PaymentMethodId("paymentId"),
    AutoPay(true),
    AccountBalanceMinorUnits(1234),
    GBP
  )

  val nonDirectDebitPaymentMethod = NonDirectDebitMethod(
    ActivePaymentMethod,
    CreditCard
  )

  val subscriptionList = List(
    Subscription(
      Active,
      Set(ProductRatePlanId("planId"))
    )
  )

  val contacts = Contacts(
    billTo = BilltoContact(
      FirstName("billToName"),
      LastName("billToLastName"),
      None,
      Some(Country.UK)
    ),
    soldTo = SoldToContact(
      FirstName("soldToName"),
      LastName("soldToLastName"),
      Some(Email("work@email.com")),
      Country.US
    )
  )
}
