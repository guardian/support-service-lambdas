package com.gu.productmove.salesforce

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.salesforce.CreateRecord.CreateRecordRequest
import zio.{RIO, ZIO}
import zio.json.*

import java.time.LocalDate

object Salesforce {

  case class SalesforceRecordInput(
      subscriptionName: String,
      previousAmount: BigDecimal,
      newAmount: BigDecimal,
      previousProductName: String,
      previousRatePlanName: String,
      newRatePlanName: String,
      requestedDate: LocalDate,
      effectiveDate: LocalDate,
      paidAmount: BigDecimal,
      csrUserId: Option[String],
      caseId: Option[String],
  )

  given JsonDecoder[SalesforceRecordInput] = DeriveJsonDecoder.gen[SalesforceRecordInput]
  given JsonEncoder[SalesforceRecordInput] = DeriveJsonEncoder.gen[SalesforceRecordInput]

  def createSfRecord(
      salesforceRecordInput: SalesforceRecordInput,
  ): RIO[CreateRecord & GetSfSubscription, Unit] = {
    import salesforceRecordInput.*

    for {
      sfSub <- GetSfSubscription.get(subscriptionName)
      request = CreateRecordRequest(
        SF_Subscription__c = sfSub.Id,
        Previous_Amount__c = previousAmount,
        New_Amount__c = newAmount,
        Previous_Product_Name__c = previousProductName,
        Previous_Rate_Plan_Name__c = previousRatePlanName,
        New_Rate_Plan_Name__c = newRatePlanName,
        Requested_Date__c = requestedDate,
        Effective_Date__c = effectiveDate,
        Paid_Amount__c = paidAmount,
        CSR__c = csrUserId,
        Case__c = caseId,
        Source__c = csrUserId.map(_ => "CSR").getOrElse("MMA"),
      )
      _ <- CreateRecord.create(request)
    } yield ()
  }
}
