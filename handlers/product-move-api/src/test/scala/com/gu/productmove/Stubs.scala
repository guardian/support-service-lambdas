package com.gu.productmove

import com.gu.newproduct.api.productcatalog.{Monthly, ZuoraIds}
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.GetSubscriptionToCancelResponse
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.CreateRecord.CreateRecordRequest
import com.gu.productmove.salesforce.GetSfSubscription.GetSfSubscriptionResponse
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetAccount.{AccountSubscription, BasicInfo, BillToContact, GetAccountResponse}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlan, RatePlanCharge}
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.Fixtures.{
  invoiceWithMultipleInvoiceItems,
  invoiceWithTax,
  subscriptionsPreviewResponse,
  subscriptionsPreviewResponse2,
  subscriptionsPreviewResponse3,
}
import com.gu.productmove.zuora.GetInvoiceItems.{GetInvoiceItemsResponse, InvoiceItem}
import com.gu.productmove.{EmailMessage, EmailPayload, RCtoSPEmailPayloadProductSwitchAttributes}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.util.config.Stage

import java.time.LocalDate

//======================================================================
// Stubs/test data/Mock Data
//======================================================================

//-----------------------------------------------------
// Stubs for GetSubscription service
//-----------------------------------------------------
val ratePlanCharge1 = RatePlanCharge(
  id = "RPC1",
  productRatePlanChargeId = "PRPC1",
  name = "Contribution",
  price = Some(5.000000000),
  currency = "GBP",
  number = "number",
  effectiveStartDate = LocalDate.of(2017, 12, 15),
  effectiveEndDate = LocalDate.of(2020, 11, 29),
  chargedThroughDate = Some(LocalDate.of(2022, 9, 29)),
  billingPeriod = Monthly,
)

val ratePlanCharge2 = RatePlanCharge(
  id = "RPC1",
  productRatePlanChargeId = "PRPC1",
  name = "Contribution",
  price = Some(5.000000000),
  currency = "GBP",
  number = "number",
  effectiveStartDate = LocalDate.of(2021, 1, 15),
  effectiveEndDate = LocalDate.of(2022, 1, 15),
  chargedThroughDate = Some(LocalDate.of(2021, 2, 15)),
  billingPeriod = Monthly,
)

val getSubscriptionResponse = GetSubscriptionResponse(
  "A-S00339056",
  "zuoraAccountId",
  AccountNumber("accountNumber"),
  ratePlans = List(
    RatePlan(
      id = "89ad8casd9c0asdcaj89sdc98as",
      productName = "P1",
      productRatePlanId = "2c92a0fc5aacfadd015ad24db4ff5e97",
      ratePlanName = "RP1",
      ratePlanCharges = List(ratePlanCharge1),
      lastChangeType = None,
    ),
  ),
)

val getSubscriptionForCancelResponse = GetSubscriptionToCancelResponse(
  id = "A-S00339056",
  version = 1,
  contractEffectiveDate = LocalDate.of(2020, 11, 29),
  accountId = "zuoraAccountId",
  accountNumber = AccountNumber("anAccountNumber"),
  ratePlans = List(
    GetSubscriptionToCancel.RatePlan(
      id = "89ad8casd9c0asdcaj89sdc98as",
      productName = "P1",
      productRatePlanId = "2c92a0fc5aacfadd015ad24db4ff5e97",
      ratePlanName = "RP1",
      lastChangeType = Some("Change"),
      ratePlanCharges = List(
        GetSubscriptionToCancel.RatePlanCharge(
          productRatePlanChargeId = ZuoraIds
            .zuoraIdsForStage(Stage("PROD"))
            .toOption
            .get
            .supporterPlusZuoraIds
            .annual
            .productRatePlanChargeId
            .value,
          name = "Contribution",
          price = 5.000000000,
          number = "number",
          effectiveStartDate = LocalDate.of(2017, 12, 15),
          effectiveEndDate = LocalDate.of(2020, 11, 29),
          chargedThroughDate = Some(LocalDate.of(2022, 9, 29)),
          billingPeriod = Some("Monthly"),
        ),
      ),
    ),
  ),
)

val getSubscriptionResponse2 = GetSubscriptionResponse(
  id = "8ad0823f841cf4e601841e61f6aa8923",
  accountNumber = AccountNumber("A00433231"),
  accountId = "8ad0823f841cf4e601841e61f6aads87",
  ratePlans = List(
    RatePlan(
      productName = "Contributor",
      ratePlanName = "Monthly Contribution",
      ratePlanCharges = List(
        RatePlanCharge(
          id = "8ad0823f841cf4e601841e61f6d98asd",
          productRatePlanChargeId = "2c92c0f85a6b1352015a7fcf35ab397c",
          name = "Contribution",
          number = "C-00732721",
          price = Some(5.000000000),
          currency = "GBP",
          billingPeriod = Monthly,
          effectiveStartDate = LocalDate.of(2022, 10, 28),
          effectiveEndDate = LocalDate.of(2022, 10, 28),
          chargedThroughDate = Some(LocalDate.of(2022, 10, 28)),
        ),
      ),
      Some("Remove"),
      "2c92c0f85a6b134e015a7fcd9f0c7855",
      "8ad0823f841cf4e601841e61f6d47234",
    ),
    RatePlan(
      "Supporter Plus",
      "Supporter Plus Monthly",
      List(
        RatePlanCharge(
          id = "id",
          productRatePlanChargeId = "8ad09ea0858682bb0185880ac57f4c4c",
          name = "Supporter Plus Monthly",
          number = "C-00732747",
          price = Some(30.000000000),
          currency = "GBP",
          billingPeriod = Monthly,
          chargedThroughDate = Some(LocalDate.of(2022, 11, 28)),
          effectiveStartDate = LocalDate.of(2022, 10, 28),
          effectiveEndDate = LocalDate.of(2023, 10, 28),
        ),
      ),
      Some("Add"),
      "8ad08cbd8586721c01858804e3275376",
      "8ad0823f841cf4e601841e61f6d470bb",
    ),
  ),
)

val getSubscriptionResponse3 = GetSubscriptionResponse(
  "A-S00339056",
  "zuoraAccountId",
  AccountNumber("accountNumber"),
  ratePlans = List(
    RatePlan(
      id = "89ad8casd9c0asdcaj89sdc98as",
      productName = "P1",
      productRatePlanId = "2c92a0fc5aacfadd015ad24db4ff5e97",
      ratePlanName = "RP1",
      ratePlanCharges = List(ratePlanCharge2),
      lastChangeType = None,
    ),
  ),
)

val getSubscriptionResponseNoChargedThroughDate = GetSubscriptionResponse(
  "subscriptionName",
  "zuoraAccountId",
  AccountNumber("accountNumber"),
  ratePlans = List(
    RatePlan(
      id = "R1",
      productName = "P1",
      productRatePlanId = "PRP1",
      lastChangeType = None,
      ratePlanName = "RP1",
      ratePlanCharges = List(
        RatePlanCharge(
          id = "RPC1",
          productRatePlanChargeId = "PRPC1",
          name = "Digital Pack Monthly",
          price = Some(11.11),
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
// Stubs for ZuoraCancel service
//-----------------------------------------------------

val cancellationResponse1 = CancellationResponse(
  "8ad08d29860bd93e0186127£052a6414",
  cancelledDate = LocalDate.of(2023, 2, 2),
  Some("Sad08d29860bd93e0186127f060e6444"),
)

val cancellationResponse2 = CancellationResponse(
  "8a129cc3861a835d01862248d8ee5c9d",
  cancelledDate = LocalDate.of(2023, 2, 19),
  None,
)

//-----------------------------------------------------
// Stubs for Dynamo service
//-----------------------------------------------------

val supporterRatePlanItem1 = SupporterRatePlanItem(
  subscriptionName = "A-S00339056",
  identityId = "12345",
  gifteeIdentityId = None,
  productRatePlanId = "8a128ed885fc6ded018602296ace3eb8",
  productRatePlanName = "product-move-api added Supporter Plus Monthly",
  termEndDate = LocalDate.of(2022, 5, 17),
  contractEffectiveDate = LocalDate.of(2022, 5, 10),
  contributionAmount = None,
)

val supporterRatePlanItem2 = SupporterRatePlanItem(
  subscriptionName = "A-S00339056",
  identityId = "12345",
  gifteeIdentityId = None,
  productRatePlanId = "8ad08cbd8586721c01858804e3275376",
  productRatePlanName = "product-move-api added Supporter Plus Monthly",
  termEndDate = LocalDate.of(2021, 2, 22),
  contractEffectiveDate = LocalDate.of(2021, 2, 15),
  contributionAmount = None,
)

//-----------------------------------------------------
// Stubs for SQS service
//-----------------------------------------------------
val emailMessageBody = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      RCtoSPEmailPayloadProductSwitchAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "20.00",
        price = "15.00",
        payment_frequency = "monthly",
        date_of_first_payment = "10 May 2022",
        currency = "£",
      ),
    ),
  ),
  "SV_RCtoSP_Switch",
  "sfContactId",
  Some("12345"),
)

val emailMessageBodyRefund = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      RCtoSPEmailPayloadProductSwitchAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "-4.00",
        price = "50.00",
        payment_frequency = "monthly",
        date_of_first_payment = "10 May 2022",
        currency = "£",
      ),
    ),
  ),
  "SV_RCtoSP_Switch",
  "sfContactId",
  Some("12345"),
)

val emailMessageBodyNoPaymentOrRefund = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      RCtoSPEmailPayloadProductSwitchAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "0.00",
        price = "15.00",
        payment_frequency = "monthly",
        date_of_first_payment = "10 May 2022",
        currency = "£",
      ),
    ),
  ),
  "SV_RCtoSP_Switch",
  "sfContactId",
  Some("12345"),
)

val emailMessageLowCharge = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      RCtoSPEmailPayloadProductSwitchAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        first_payment_amount = "0.00",
        price = "15.00",
        payment_frequency = "monthly",
        date_of_first_payment = "15 February 2021",
        currency = "£",
      ),
    ),
  ),
  "SV_RCtoSP_Switch",
  "sfContactId",
  Some("12345"),
)

// MembershipToRecurringContribution
val emailMessageBody2 = EmailMessage(
  To = EmailPayload(
    Address = Some("example@gmail.com"),
    EmailPayloadContactAttributes(
      toRCEmailPayloadProductSwitchAttributes(
        subscription_id = "A-S00339056",
        first_name = "John",
        last_name = "Hee",
        price = "5.00",
        payment_frequency = "monthly",
        start_date = "29 September 2022",
        currency = "£",
      ),
    ),
  ),
  "SV_MBtoRC_Switch",
  "sfContactId",
  Some("12345"),
)

val refundInput1 = RefundInput(
  subscriptionName = SubscriptionName("A-S00339056"),
)

val salesforceRecordInput1 = SalesforceRecordInput(
  "A-S00339056",
  BigDecimal(5.0),
  BigDecimal(5.0),
  "P1",
  "RP1",
  "Recurring Contribution",
  LocalDate.of(2022, 5, 10),
  LocalDate.of(2022, 9, 29),
  BigDecimal(0),
  csrUserId = None,
  caseId = None,
)
val salesforceRecordInput2 = SalesforceRecordInput(
  "A-S00339056",
  BigDecimal(5),
  BigDecimal(15),
  "P1",
  "RP1",
  "Supporter Plus",
  LocalDate.of(2022, 5, 10),
  LocalDate.of(2022, 5, 10),
  BigDecimal(20),
  csrUserId = None,
  caseId = None,
)
val salesforceRecordInput3 = SalesforceRecordInput(
  "A-S00339056",
  BigDecimal(5),
  BigDecimal(15),
  "P1",
  "RP1",
  "Supporter Plus",
  LocalDate.of(2022, 5, 10),
  LocalDate.of(2022, 5, 10),
  BigDecimal(0),
  csrUserId = None,
  caseId = None,
)
val salesforceRecordInput4 = SalesforceRecordInput(
  "A-S00339056",
  BigDecimal(5),
  BigDecimal(15),
  "P1",
  "RP1",
  "Supporter Plus",
  LocalDate.of(2021, 2, 15),
  LocalDate.of(2021, 2, 15),
  BigDecimal(0),
  csrUserId = None,
  caseId = None,
)

//-----------------------------------------------------
// Stubs for SubscriptionUpdate service
//-----------------------------------------------------
val subscriptionUpdateResponse =
  SubscriptionUpdateResponse("8ad0823f841cf4e601841e61f7b57mkd", 28, Some("89ad8casd9c0asdcaj89sdc98as"), Some(20))
val subscriptionUpdateResponse2 =
  SubscriptionUpdateResponse("8ad0823f841cf4e601841e61f7b57osi", -4, Some("80a23d9sdf9a89fs8cjjk2"), Some(10))
val subscriptionUpdateResponse3 =
  SubscriptionUpdateResponse("8ad0823f841cf4e601841e61f7b57jsd", 28, Some("89ad8casd9c0asdcaj89sdc98as"), None)
val subscriptionUpdateResponse4 = SubscriptionUpdateResponse(
  "8ad0823f841cf4e601841e61f6d070b8",
  BigDecimal(25),
  Some("8ad0823f841cf4e601841e61f7b570e8"),
  Some(25),
)
val subscriptionUpdateResponse5 =
  SubscriptionUpdateResponse("8ad08ccf844271800184528017044b36", -4, Some("8ad08ccf844271800184528017b24b4b"), None)

val timeLocalDate = LocalDate.of(2022, 5, 10)
val timeLocalDate2 = LocalDate.of(2023, 2, 6)
val timeLocalDate3 = LocalDate.of(2022, 9, 29)
val timeLocalDate4 = LocalDate.of(2021, 2, 15)

// RecurringContributionToSupporterPlus
val expectedRequestBody = SwitchProductUpdateRequest(
  add = List(
    AddRatePlan(
      contractEffectiveDate = timeLocalDate,
      productRatePlanId = "8a128ed885fc6ded018602296ace3eb8",
      chargeOverrides = List(
        ChargeOverrides(
          price = Some(5.00),
          productRatePlanChargeId = "8a128d7085fc6dec01860234cd075270",
        ),
      ),
    ),
  ),
  remove = List(
    RemoveRatePlan(
      contractEffectiveDate = timeLocalDate,
      ratePlanId = "89ad8casd9c0asdcaj89sdc98as",
    ),
  ),
  collect = Some(true),
  runBilling = Some(true),
  preview = Some(false),
)

val expectedRequestBodyLowCharge = SwitchProductUpdateRequest(
  add = List(
    AddRatePlan(
      contractEffectiveDate = timeLocalDate4,
      productRatePlanId = "8ad08cbd8586721c01858804e3275376",
      chargeOverrides = List(
        ChargeOverrides(
          price = Some(5.00),
          productRatePlanChargeId = "8ad09ea0858682bb0185880ac57f4c4c",
        ),
      ),
    ),
  ),
  remove = List(
    RemoveRatePlan(
      contractEffectiveDate = timeLocalDate4,
      ratePlanId = "89ad8casd9c0asdcaj89sdc98as",
    ),
  ),
  collect = Some(false),
  runBilling = Some(true),
  preview = Some(false),
)

// MembershipToRecurringContribution
val expectedRequestBody2 = SwitchProductUpdateRequest(
  add = List(
    AddRatePlan(
      contractEffectiveDate = timeLocalDate3,
      productRatePlanId = "2c92a0fc5aacfadd015ad24db4ff5e97",
      chargeOverrides = List(
        ChargeOverrides(
          price = Some(5.00),
          productRatePlanChargeId = "2c92a0fc5aacfadd015ad250bf2c6d38",
        ),
      ),
    ),
  ),
  remove = List(
    RemoveRatePlan(
      contractEffectiveDate = timeLocalDate3,
      ratePlanId = "89ad8casd9c0asdcaj89sdc98as",
    ),
  ),
  collect = Some(false),
  runBilling = Some(true),
  preview = Some(false),
)

// RecurringContributionToSupporterPlus
val expectedRequestBodyPreview = SwitchProductUpdateRequest(
  add = List(
    AddRatePlan(
      contractEffectiveDate = timeLocalDate2,
      productRatePlanId = "8ad08cbd8586721c01858804e3275376",
      chargeOverrides = List(
        ChargeOverrides(
          price = Some(5.00),
          productRatePlanChargeId = "8ad09ea0858682bb0185880ac57f4c4c",
        ),
      ),
    ),
  ),
  remove = List(
    RemoveRatePlan(
      contractEffectiveDate = timeLocalDate2,
      ratePlanId = "89ad8casd9c0asdcaj89sdc98as",
    ),
  ),
  preview = Some(true),
  targetDate = Some(LocalDate.of(2024, 3, 6)),
  currentTerm = Some("24"),
  currentTermPeriodType = Some("Month"),
)

// RecurringContributionToSupporterPlus
val expectedRequestBodyPreview2 = SwitchProductUpdateRequest(
  add = List(
    AddRatePlan(
      contractEffectiveDate = timeLocalDate4,
      productRatePlanId = "8ad08cbd8586721c01858804e3275376",
      chargeOverrides = List(
        ChargeOverrides(
          price = Some(5.00),
          productRatePlanChargeId = "8ad09ea0858682bb0185880ac57f4c4c",
        ),
      ),
    ),
  ),
  remove = List(
    RemoveRatePlan(
      contractEffectiveDate = timeLocalDate4,
      ratePlanId = "89ad8casd9c0asdcaj89sdc98as",
    ),
  ),
  preview = Some(true),
  targetDate = Some(LocalDate.of(2022, 3, 15)),
  currentTerm = Some("24"),
  currentTermPeriodType = Some("Month"),
)

val previewResponse = SubscriptionUpdatePreviewResponse(
  subscriptionsPreviewResponse,
)

val previewResponse2 = SubscriptionUpdatePreviewResponse(
  subscriptionsPreviewResponse2,
)

val previewResponse3 = SubscriptionUpdatePreviewResponse(
  subscriptionsPreviewResponse3,
)

//-----------------------------------------------------
// Stubs for SubscriptionUpdate preview service
//-----------------------------------------------------
val subscriptionUpdatePreviewResult = PreviewResult(40, false, -10, 50, LocalDate.of(2023, 6, 10))
val subscriptionUpdatePreviewResult2 = PreviewResult(15, false, 5, 20, LocalDate.of(2021, 3, 15))
val subscriptionUpdatePreviewResult3 = PreviewResult(0.20, false, 5, 20, LocalDate.of(2021, 3, 15))

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
  New_Amount__c = BigDecimal(100),
  Previous_Product_Name__c = "previous product name",
  Previous_Rate_Plan_Name__c = "previous rate plan",
  New_Rate_Plan_Name__c = "new rate plan",
  Requested_Date__c = LocalDate.parse("2022-12-08"),
  Effective_Date__c = LocalDate.parse("2022-12-09"),
  Paid_Amount__c = BigDecimal(50),
  CSR__c = None,
  Case__c = None,
)

val createRecordRequest2 = CreateRecordRequest(
  SF_Subscription__c = "123456",
  Previous_Amount__c = BigDecimal(100),
  New_Amount__c = BigDecimal(100),
  Previous_Product_Name__c = "previous product name",
  Previous_Rate_Plan_Name__c = "previous rate plan",
  New_Rate_Plan_Name__c = "new rate plan",
  Requested_Date__c = LocalDate.parse("2022-12-08"),
  Effective_Date__c = LocalDate.parse("2022-12-09"),
  Paid_Amount__c = BigDecimal(50),
  CSR__c = Some("a_csr_id"),
  Case__c = Some("a_case_id"),
  Source__c = "CSR",
)

//-----------------------------------------------------
// Stubs for GetInvoiceItems service
//-----------------------------------------------------
val getInvoiceItemsResponse = GetInvoiceItemsResponse(
  List(
    InvoiceItem(
      "invoice_item_id",
      "8ad08cbd8586721c01858804e3715378",
    ),
  ),
)
