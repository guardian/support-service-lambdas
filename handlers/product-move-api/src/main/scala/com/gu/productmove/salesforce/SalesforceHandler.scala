package com.gu.productmove.salesforce

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.salesforce.Salesforce.{SalesforceRecordInput, createSfRecord}
import com.gu.productmove.{AwsCredentialsLive, GuStageLive, SecretsLive, SttpClientLive}
import sttp.client3.SttpBackend
import zio.json.*
import zio.{Exit, Runtime, Task, Unsafe, ZIO}

import scala.jdk.CollectionConverters.*

class SalesforceHandler extends RequestHandler[SQSEvent, Unit] {
  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    val records: List[SQSEvent.SQSMessage] = input.getRecords.asScala.toList

    val results = records.map { record =>
      val result = for {
        salesforceRecordInput <- record.getBody
          .fromJson[SalesforceRecordInput]
          .left
          .map(msg => new RuntimeException("failed to deserialise input: " + msg))
        _ = context.getLogger.log(s"Processing salesforceRecordInput with body: ${record.getBody}")
        _ <- runZio(salesforceRecordInput, context)
      } yield ()
      result.left.foreach(ex => context.getLogger.log(ex.toString))
      result
    }
    val numErrors =
      results.collect { case Left(ex) =>
        ex
      }.length
    if (numErrors > 0)
      throw new RuntimeException("Lambda failed due to previously logged errors")
  }

  def runZio(salesforceRecordInput: SalesforceRecordInput, context: Context): Either[RuntimeException, Unit] = {
    val runtime = Runtime.default
    Unsafe.unsafe { implicit u =>
      runtime.unsafe.run(
        createSfRecord(salesforceRecordInput)
          .provide(
            SttpClientLive.layer,
            GetSfSubscriptionLive.layer,
            SalesforceClientLive.layer,
            CreateRecordLive.layer,
            SecretsLive.layer,
            AwsCredentialsLive.layer,
            GuStageLive.layer,
          ),
      ) match {
        case Exit.Success(value) => Right(value)
        case Exit.Failure(cause) =>
          context.getLogger.log("Failed with: " + cause.toString)
          Left(new RuntimeException("Salesforce record creation failed with error: " + cause.toString))
      }
    }
  }
}
