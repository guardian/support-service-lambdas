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

object SalesforceHandler extends SalesforceHandler {
  type TIO[+A] = ZIO[Any, Any, A] // Succeed with an `A`, may fail with anything`, no requirements.
}
trait SalesforceHandler extends RequestHandler[SQSEvent, Unit] {
  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    val records: List[SQSEvent.SQSMessage] = input.getRecords.asScala.toList

    records.map { record =>
      val maybeSalesforceRecordInput = record.getBody.fromJson[SalesforceRecordInput]

      maybeSalesforceRecordInput match {
        case Right(salesforceRecordInput) => runZio(salesforceRecordInput, context)
        case Left(ex) =>
          context.getLogger.log(s"Error '$ex' when decoding JSON to SalesforceRecordInput with body: ${record.getBody}")
      }
    }
  }

  case class SalesforceRecordInput(
      subscriptionName: String,
      previousAmount: BigDecimal,
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
        Previous_Rate_Plan_Name__c = previousRatePlanName,
        New_Rate_Plan_Name__c = newRatePlanName,
        Requested_Date__c = requestedDate,
        Effective_Date__c = effectiveDate,
        Refund_Amount__c = refundAmount,
      )
      _ <- CreateRecord.create(request)
    } yield ()

  def runZio(salesforceRecordInput: SalesforceRecordInput, context: Context) =
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
            CreateRecordLive.layer,
          ),
      ) match
        case Exit.Success(value) => value
        case Exit.Failure(cause) => context.getLogger.log("Failed with: " + cause.toString)
    }
}
