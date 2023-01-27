package com.gu.productmove.salesforce

import com.gu.productmove.salesforce.CreateRecord.CreateRecordRequest
import zio.ZIO
import zio.json.*
import java.time.LocalDate

object Salesforce {

  case class SalesforceRecordInput(
      subscriptionName: String,
      previousAmount: BigDecimal,
      previousProductName: String,
      previousRatePlanName: String,
      newRatePlanName: String,
      requestedDate: LocalDate,
      effectiveDate: LocalDate,
      refundAmount: BigDecimal,
  )

  given JsonDecoder[SalesforceRecordInput] = DeriveJsonDecoder.gen[SalesforceRecordInput]
  given JsonEncoder[SalesforceRecordInput] = DeriveJsonEncoder.gen[SalesforceRecordInput]

  def createSfRecord(
      salesforceRecordInput: SalesforceRecordInput,
  ): ZIO[CreateRecord with GetSfSubscription, String, Unit] =
    import salesforceRecordInput.*

    for {
      sfSub <- GetSfSubscription.get(subscriptionName)
      request = CreateRecordRequest(
        SF_Subscription__c = sfSub.Id,
        Previous_Amount__c = previousAmount,
        Previous_Product_Name__c = previousProductName,
        Previous_Rate_Plan_Name__c = previousRatePlanName,
        New_Rate_Plan_Name__c = newRatePlanName,
        Requested_Date__c = requestedDate,
        Effective_Date__c = effectiveDate,
        Refund_Amount__c = refundAmount,
      )
      _ <- CreateRecord.create(request)
    } yield ()
}
