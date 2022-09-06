package com.gu.productmove

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
val getSubscriptionResponse = GetSubscriptionResponse("subscriptionName", "zuoraAccountId", "accountNumber", ratePlans = List(
  RatePlan(
    id = "R1",
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
        billingPeriod = Some("billingPeriod"),
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
    "John",
    "Hee",
    balance = 0,
    currency = "GBP"
  ),
  BillToContact("example@gmail.com"),
  List(AccountSubscription("subscriptionId"))
)

val directDebitGetAccountResponse = GetAccountResponse(
  BasicInfo(
    DefaultPaymentMethod("paymentMethodId", None),
    "John",
    "Hee",
    balance = 0,
    currency = "GBP"
  ),
  BillToContact("example@gmail.com"),
  List(AccountSubscription("subscriptionId"))
)

//-----------------------------------------------------
// Stubs for EmailSender service
//-----------------------------------------------------
val emailMessageBody = EmailMessage(
  To = EmailPayload(
    Address = Some("john.hee@gmail.com"),
    EmailPayloadContactAttributes(
      EmailPayloadSubscriberAttributes(
        subscription_id = "A-S234234",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "4",
        payment_frequency = "Month",
        date_of_first_payment = "234-34-234",
        currency = "GBP",
        promotion = "50% off for 3 months",
        contribution_cancellation_date = "123123-1231-123"
      )
    )
  ),
  "BrazeCampaignName"
)

//-----------------------------------------------------
// Stubs for InvoicePreview service
//-----------------------------------------------------
val DigiSubWithOfferInvoicePreview = ZuoraInvoiceList(
  List(
    ZuoraInvoiceItem(
      subscriptionName = "A-S00391001",
      serviceStartDate = LocalDate.of(2022, 7, 31),
      chargeAmount = 9.9,
      taxAmount = 2
   ),
    ZuoraInvoiceItem(
      subscriptionName = "A-S00391001",
      serviceStartDate = LocalDate.of(2022, 7, 31),
      chargeAmount = -5,
      taxAmount = -1
    )
  )
)
