package com.gu.newproduct

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.validation.ValidatedAccount
import com.gu.newproduct.api.addsubscription.validation.contribution.ContributionCustomerData
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.GuardianWeeklyCustomerData
import com.gu.newproduct.api.addsubscription.validation.paper.PaperCustomerData
import com.gu.newproduct.api.addsubscription.validation.supporterplus.SupporterPlusCustomerData
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{AccountBalanceMinorUnits, AutoPay, IdentityId, PaymentMethodId, SfContactId}
import com.gu.newproduct.api.addsubscription.zuora.GetAccountSubscriptions.{Active, Subscription}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId

object TestData {
  val validatedAccount = ValidatedAccount(
    identityId = Some(IdentityId("identityId")),
    paymentMethodId = PaymentMethodId("paymentMethodId"),
    autoPay = AutoPay(true),
    accountBalanceMinorUnits = AccountBalanceMinorUnits(1234),
    currency = GBP,
    sfContactId = Some(SfContactId("sfContactId"))
  )
  val contacts = Contacts(
    billTo = BillToContact(
      Some(Title("billToTitle")),
      FirstName("billToFirstName"),
      LastName("billToLastName"),
      Some(Email("billToEmail@mail.com")),
      BillToAddress(
        Some(Address1("billToAddress1")),
        Some(Address2("billToAddress2")),
        Some(City("billToCity")),
        Some(State("billToState")),
        Some(Country.UK),
        Some(Postcode("billToPostcode"))
      )
    ),
    soldTo = SoldToContact(
      Some(Title("soldToTitle")),
      FirstName("soldToFirstName"),
      LastName("soldToLastName"),
      Some(Email("soldToEmail@mail.com")),
      SoldToAddress(
        Some(Address1("soldToAddress1")),
        Some(Address2("soldToAddress2")),
        Some(City("soldToCity")),
        Some(State("soldToState")),
        Country.US,
        Some(Postcode("soldToPostcode"))
      )
    )
  )

  val directDebitPaymentMethod = DirectDebit(
    ActivePaymentMethod,
    BankAccountName("someName"),
    BankAccountNumberMask("123312***"),
    SortCode("233331"),
    MandateId("1234 ")
  )

  val subscriptionList = List(
    Subscription(
      Active,
      Set(ProductRatePlanId("planId"))
    )
  )

  val contributionCustomerData = ContributionCustomerData(
    account = validatedAccount,
    paymentMethod = directDebitPaymentMethod,
    accountSubscriptions = subscriptionList,
    contacts = contacts
  )

  val supporterPlusCustomerData = SupporterPlusCustomerData(
    account = validatedAccount,
    paymentMethod = directDebitPaymentMethod,
    accountSubscriptions = subscriptionList,
    contacts = contacts
  )

  val voucherCustomerData = PaperCustomerData(
    account = validatedAccount,
    paymentMethod = directDebitPaymentMethod,
    contacts = contacts
  )

  val guardianWeeklyCustomerData = GuardianWeeklyCustomerData(
    account = validatedAccount,
    paymentMethod = directDebitPaymentMethod,
    contacts = contacts
  )
}
