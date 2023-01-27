package com.gu.productmove

import com.gu.newproduct.api.productcatalog.Monthly
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.CreateRecord.CreateRecordRequest
import com.gu.productmove.salesforce.GetSfSubscription.GetSfSubscriptionResponse
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.{EmailMessage, EmailPayload, EmailPayloadSubscriberAttributes}
import com.gu.productmove.zuora.{
  DefaultPaymentMethod,
  SubscriptionUpdateInvoice,
  SubscriptionUpdateInvoiceItem,
  SubscriptionUpdatePreviewResponse,
  SubscriptionUpdateResponse,
}
import com.gu.productmove.zuora.GetAccount.{AccountSubscription, BasicInfo, BillToContact, GetAccountResponse}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.supporterdata.model.SupporterRatePlanItem

import java.time.LocalDate

//======================================================================
// Stubs/test data/Mock Data
//======================================================================

//-----------------------------------------------------
// Stubs for GetSubscription service
//-----------------------------------------------------
val getSubscriptionResponse = GetSubscriptionResponse(
  "A-S00339056",
  "zuoraAccountId",
  "accountNumber",
  ratePlans = List(
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
        ),
      ),
    ),
  ),
)

val getSubscriptionResponse2 = GetSubscriptionResponse(
  id = "8ad0823f841cf4e601841e61f6aa8923",
  accountNumber = "A00433231",
  accountId = "8ad0823f841cf4e601841e61f6aads87",
  ratePlans = List(
    RatePlan(
      productName = "Contributor",
      ratePlanName = "Monthly Contribution",
      ratePlanCharges = List(
        RatePlanCharge(
          productRatePlanChargeId = "2c92c0f85a6b1352015a7fcf35ab397c",
          name = "Contribution",
          number = "C-00732721",
          price = 5.000000000,
          currency = "GBP",
          billingPeriod = Monthly,
          effectiveStartDate = LocalDate.of(2022, 10, 28),
          effectiveEndDate = LocalDate.of(2022, 10, 28),
          chargedThroughDate = Some(LocalDate.of(2022, 10, 28)),
        ),
      ),
      "2c92c0f85a6b134e015a7fcd9f0c7855",
      "8ad0823f841cf4e601841e61f6d47234",
    ),
    RatePlan(
      "Supporter Plus",
      "Supporter Plus Monthly",
      List(
        RatePlanCharge(
          productRatePlanChargeId = "8ad09fc281de1ce70181de3b253e36a6",
          name = "Supporter Plus Monthly",
          number = "C-00732747",
          price = 30.000000000,
          currency = "GBP",
          billingPeriod = Monthly,
          chargedThroughDate = Some(LocalDate.of(2022, 11, 28)),
          effectiveStartDate = LocalDate.of(2022, 10, 28),
          effectiveEndDate = LocalDate.of(2023, 10, 28),
        ),
      ),
      "8ad09fc281de1ce70181de3b251736a4",
      "8ad0823f841cf4e601841e61f6d470bb",
    ),
  ),
)

val getSubscriptionResponseNoChargedThroughDate = GetSubscriptionResponse(
  "subscriptionName",
  "zuoraAccountId",
  "accountNumber",
  ratePlans = List(
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
        ),
      ),
    ),
  ),
)

//-----------------------------------------------------
// Stubs for GetAccount service
//-----------------------------------------------------
val getAccountResponse = GetAccountResponse(
  BasicInfo(
    DefaultPaymentMethod("paymentMethodId", Some(LocalDate.of(2030, 12, 1))),
    Some("12345"),
    "sfContactId",
    balance = 0,
    currency = Currency.GBP,
  ),
  BillToContact("John", "Hee", "example@gmail.com"),
  List(AccountSubscription("subscriptionId")),
)

val getAccountResponse2 = GetAccountResponse(
  BasicInfo(
    DefaultPaymentMethod("paymentMethodId", Some(LocalDate.of(2030, 12, 1))),
    None,
    "sfContactId",
    balance = 0,
    currency = Currency.GBP,
  ),
  BillToContact("John", "Hee", "example@gmail.com"),
  List(AccountSubscription("subscriptionId")),
)

val directDebitGetAccountResponse = GetAccountResponse(
  BasicInfo(
    DefaultPaymentMethod("paymentMethodId", None),
    None,
    "sfContactId",
    balance = 0,
    currency = Currency.GBP,
  ),
  BillToContact("John", "Hee", "example@gmail.com"),
  List(AccountSubscription("subscriptionId")),
)

//-----------------------------------------------------
// Stubs for Dynamo service
//-----------------------------------------------------

val supporterRatePlanItem1 = SupporterRatePlanItem(
  subscriptionName = "A-S00339056",
  identityId = "12345",
  gifteeIdentityId = None,
  productRatePlanId = "8a12865b8219d9b401822106192b64dc",
  productRatePlanName = "product-move-api added Supporter Plus Monthly",
  termEndDate = LocalDate.of(2022, 5, 17),
  contractEffectiveDate = LocalDate.of(2022, 5, 10),
  contributionAmount = None,
)

//-----------------------------------------------------
// Stubs for SQS service
//-----------------------------------------------------
val emailMessageBody = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      EmailPayloadSubscriberAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "28",
        price = "50.0",
        payment_frequency = "month",
        date_of_first_payment = "10 May 2022",
        currency = "£",
        contribution_cancellation_date = "10 May 2022",
      ),
    ),
  ),
  "SV_RCtoDP_Switch",
  "sfContactId",
  Some("12345"),
)

val emailMessageBodyRefund = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      EmailPayloadSubscriberAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "-4",
        price = "50.0",
        payment_frequency = "month",
        date_of_first_payment = "10 May 2022",
        currency = "£",
        contribution_cancellation_date = "10 May 2022",
      ),
    ),
  ),
  "SV_RCtoDP_Switch",
  "sfContactId",
  Some("12345"),
)

val refundInput1 = RefundInput(
  subscriptionName = "A-S00339056",
  invoiceId = "80a23d9sdf9a89fs8cjjk2",
  refundAmount = 4,
)

val salesforceRecordInput1 = SalesforceRecordInput(
  "A-S00339056",
  BigDecimal(50),
  "P1",
  "RP1",
  "Supporter Plus",
  LocalDate.of(2022, 5, 10),
  LocalDate.of(2022, 5, 10),
  BigDecimal(4),
)
val salesforceRecordInput2 = SalesforceRecordInput(
  "A-S00339056",
  BigDecimal(50),
  "P1",
  "RP1",
  "Supporter Plus",
  LocalDate.of(2022, 5, 10),
  LocalDate.of(2022, 5, 10),
  BigDecimal(28),
)

//-----------------------------------------------------
// Stubs for SubscriptionUpdate service
//-----------------------------------------------------
val subscriptionUpdateResponse = SubscriptionUpdateResponse("A-S00339056", 28, "89ad8casd9c0asdcaj89sdc98as")
val subscriptionUpdateResponse2 = SubscriptionUpdateResponse("A-S00339056", -4, "80a23d9sdf9a89fs8cjjk2")

//-----------------------------------------------------
// Stubs for SubscriptionUpdate preview service
//-----------------------------------------------------
val subscriptionUpdatePreviewResult = PreviewResult(40, -10, 50)

//-----------------------------------------------------
// Stubs for GetSfSubscription service
//-----------------------------------------------------
val sfSubscription1 = GetSfSubscriptionResponse(
  Id = "123456",
)

//-----------------------------------------------------
// Stubs for CreateRecord service
//-----------------------------------------------------
val createRecordRequest1 = CreateRecordRequest(
  SF_Subscription__c = "123456",
  Previous_Amount__c = BigDecimal(100),
  Previous_Product_Name__c = "previous product name",
  Previous_Rate_Plan_Name__c = "previous rate plan",
  New_Rate_Plan_Name__c = "new rate plan",
  Requested_Date__c = LocalDate.parse("2022-12-08"),
  Effective_Date__c = LocalDate.parse("2022-12-09"),
  Refund_Amount__c = BigDecimal(50),
)
