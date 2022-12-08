package com.gu.productmove.salesforce

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage
import com.gu.productmove.GuStageLive.Stage
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.productmove.salesforce.CreateRecord.CreateRecordRequest
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SttpClientLive}
import sttp.client3.SttpBackend
import zio.json.*
import zio.{Exit, Runtime, Task, Unsafe, ZIO}

import java.time.LocalDate
import scala.jdk.CollectionConverters.*

object SalesforceHandler {

  case class SalesforceRecordInput(subscriptionName: String,
                                   previousAmount: BigDecimal,
                                   previousRatePlanName: String,
                                   newRatePlanName: String,
                                   requestedDate: LocalDate,
                                   effectiveDate: LocalDate,
                                   refundAmount: BigDecimal)

  def createSfRecord(salesforceRecordInput: SalesforceRecordInput): ZIO[CreateRecord with GetSfSubscription, String, Unit] =
    import salesforceRecordInput.*

    for {
      sfSub <- GetSfSubscription.get(subscriptionName)
      request = CreateRecordRequest(
        SF_Subscription__c = sfSub.Id,
        Previous_Amount__c = previousAmount,
        Previous_Rate_Plan_Name__c = previousRatePlanName,
        New_Rate_Plan_Name__c = newRatePlanName,
        Requested_Date__c = requestedDate,
        Effective_Date__c = effectiveDate,
        Refund_Amount__c = refundAmount
      )
      _ <- CreateRecord.create(request)
    } yield ()

  def main(salesforceRecordInput: SalesforceRecordInput, context: Context) =
    val runtime = Runtime.default
    Unsafe.unsafe {
      runtime.unsafe.run(
        createSfRecord(salesforceRecordInput)
          .provide(
            AwsS3Live.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            GuStageLive.layer,
            GetSfSubscriptionLive.layer,
            SalesforceClientLive.layer,
            CreateRecordLive.layer
          )
      ) match
        case Exit.Success(value) => value
        case Exit.Failure(cause) => context.getLogger.log("Failed with: " + cause.toString)
    }
}


