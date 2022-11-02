package com.gu.productmove

import com.gu.newproduct.api.productcatalog.Monthly
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.{EmailMessage, EmailPayload, EmailPayloadSubscriberAttributes}
import com.gu.productmove.zuora.{DefaultPaymentMethod, InvoicePreview}
import com.gu.productmove.zuora.GetAccount.{AccountSubscription, BasicInfo, BillToContact, GetAccountResponse}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.productmove.zuora.InvoicePreview.*

import java.time.LocalDate

//======================================================================
// Stubs/test data/Mock Data
//======================================================================

//-----------------------------------------------------
// Stubs for GetSubscription service
//-----------------------------------------------------
val getSubscriptionResponse = GetSubscriptionResponse("A-S00339056", "zuoraAccountId", "accountNumber", ratePlans = List(
  RatePlan(
    id = "89ad8casd9c0asdcaj89sdc98as",
    productName = "P1",
    productRatePlanId = "2c92a0fc5aacfadd015ad24db4ff5e97",
    ratePlanName = "RP1",
    ratePlanCharges = List(
      RatePlanCharge(
        productRatePlanChargeId = "PRPC1",
        name = "Digital Pack Monthly",
        price = 11.11,
        currency = "GBP",
        number = "number",
        effectiveStartDate = LocalDate.of(2017, 12, 15),
        effectiveEndDate = LocalDate.of(2020, 11, 29),
        chargedThroughDate = Some(LocalDate.of(2022, 9, 29)),
        billingPeriod = Monthly,
      )
    )
  )
))

val getSubscriptionResponseNoChargedThroughDate = GetSubscriptionResponse("subscriptionName", "zuoraAccountId", "accountNumber", ratePlans = List(
  RatePlan(
    id = "R1",
    productName = "P1",
    productRatePlanId = "PRP1",
    ratePlanName = "RP1",
    ratePlanCharges = List(
      RatePlanCharge(
        productRatePlanChargeId = "PRPC1",
        name = "Digital Pack Monthly",
        price = 11.11,
        currency = "GBP",
        number = "number",
        effectiveStartDate = LocalDate.of(2017, 12, 15),
        effectiveEndDate = LocalDate.of(2020, 11, 29),
        chargedThroughDate = None,
        billingPeriod = Monthly,
      )
    )
  )
))

//-----------------------------------------------------
// Stubs for GetAccount service
//-----------------------------------------------------
val getAccountResponse = GetAccountResponse(
  BasicInfo(
    DefaultPaymentMethod("paymentMethodId", Some(LocalDate.of(2030, 12, 1))),
    None,
    "sfContactId",
    balance = 0,
    currency = Currency.GBP
  ),
  BillToContact("John", "Hee", "example@gmail.com"),
  List(AccountSubscription("subscriptionId"))
)

val directDebitGetAccountResponse = GetAccountResponse(
  BasicInfo(
    DefaultPaymentMethod("paymentMethodId", None),
    None,
    "sfContactId",
    balance = 0,
    currency = Currency.GBP
  ),
  BillToContact("John", "Hee", "example@gmail.com"),
  List(AccountSubscription("subscriptionId"))
)

//-----------------------------------------------------
// Stubs for EmailSender service
//-----------------------------------------------------
val emailMessageBody = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      EmailPayloadSubscriberAttributes(
        subscription_id = "newSubscriptionName",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "5.99",
        price = "11.99",
        payment_frequency = "Monthly",
        date_of_first_payment = "29 September 2022",
        currency = "£",
        promotion = "50% off for 3 months",
        contribution_cancellation_date = "29 September 2022"
      )
    )
  ),
  "SV_RCtoDP_Switch",
  "sfContactId",
  None
)

//-----------------------------------------------------
// Stubs for InvoicePreview service
//-----------------------------------------------------
val DigiSubWithOfferInvoicePreview = ZuoraInvoiceList(
  List(
    ZuoraInvoiceItem(
      subscriptionName = "newSubscriptionName",
      serviceStartDate = LocalDate.of(2022, 7, 31),
      chargeAmount = 9.99,
      taxAmount = 2.00
   ),
    ZuoraInvoiceItem(
      subscriptionName = "newSubscriptionName",
      serviceStartDate = LocalDate.of(2022, 7, 31),
      chargeAmount = -5.00,
      taxAmount = -1.00
    )
  )
)
