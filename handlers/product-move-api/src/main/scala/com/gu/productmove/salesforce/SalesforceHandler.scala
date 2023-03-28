package com.gu.productmove.salesforce

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage
import com.gu.productmove.GuStageLive.Stage
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.productmove.salesforce.CreateRecord.CreateRecordRequest
import com.gu.productmove.salesforce.Salesforce.{SalesforceRecordInput, createSfRecord}
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SttpClientLive}
import sttp.client3.SttpBackend
import zio.json.*
import zio.{Exit, Runtime, Task, Unsafe, ZIO}

import scala.jdk.CollectionConverters.*

class SalesforceHandler extends RequestHandler[SQSEvent, Unit] {
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

  def runZio(salesforceRecordInput: SalesforceRecordInput, context: Context) =
    val runtime = Runtime.default
    Unsafe.unsafe { implicit u =>
      runtime.unsafe.run(
        createSfRecord(salesforceRecordInput)
          .provide(
            SttpClientLive.layer,
            GetSfSubscriptionLive.layer,
            SalesforceClientLive.layer,
            CreateRecordLive.layer,
          ),
      ) match
        case Exit.Success(value) => value
        case Exit.Failure(cause) =>
          context.getLogger.log("Failed with: " + cause.toString)
          throw new RuntimeException("Salesforce record creation failed with error: " + cause.toString)
    }
}
