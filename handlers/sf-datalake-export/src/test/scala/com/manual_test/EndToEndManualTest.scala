package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.handlers.{DownloadBatchHandler, GetBatchesHandler, StartJobHandler}
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams.SfQueryInfo
import play.api.libs.json._

/** Run a query as a salesforce job, wait for it to complete and copy the results to s3.
  *
  * See a log entry like "Copying file to S3. Bucket: gu-salesforce-export-dev | Key:
  * ImovoContract_2019-07-01_7503E0000063xJmQAI_7523E0000029Hyi.csv" at the end of the execution.
  */
object EndToEndManualTest extends App {

  case class Job(jobId: String, jobName: String, objectName: String, uploadToDataLake: Boolean)

  case class Batch(batchId: String, state: String)

  case class Batches(
      jobId: String,
      jobName: String,
      objectName: String,
      jobStatus: String,
      batches: Seq[Batch],
      uploadToDataLake: Boolean,
  ) {
    def isCompleted = jobStatus == "Completed"

    def isFailed = jobStatus == "Failed"
  }

  implicit val jobFormat = Json.format[Job]
  implicit val batchFormat = Json.format[Batch]
  implicit val batchesWrites = Json.format[Batches]

  val job = startJob(BulkApiParams.imovoContract)
  msg(job)
  val batches = waitBatchesToComplete(job)
  msg(batches)
  downloadBatches(batches)

  def startJob(sfObject: SfQueryInfo): Job = {

    val request =
      s"""{
         |"objectName" : "${sfObject.objectName.value}"
         |}
    """.stripMargin

    val testInputStream = new ByteArrayInputStream(request.getBytes)
    val testOutput = new ByteArrayOutputStream
    StartJobHandler(testInputStream, testOutput, null)

    Json.parse(testOutput.toByteArray).as[Job]
  }

  def waitBatchesToComplete(job: Job): Batches = {
    val batches = getBatches(job)

    if (batches.isCompleted) batches
    else if (batches.isFailed)
      throw new IllegalStateException(s"Batch failed: $batches")
    else {
      println("Batches not complete: " + batches)

      Thread.sleep(2000)
      waitBatchesToComplete(job)
    }
  }

  def getBatches(job: Job) = {
    val request = Json.prettyPrint(Json.toJson(job))

    val testInputStream = new ByteArrayInputStream(request.getBytes)
    val testOutput = new ByteArrayOutputStream
    GetBatchesHandler(testInputStream, testOutput, null)

    Json.parse(testOutput.toByteArray).as[Batches]
  }

  def downloadBatches(batches: Batches) = {
    val request = Json.prettyPrint(Json.toJson(batches))

    msg(request)

    val testInputStream = new ByteArrayInputStream(request.getBytes)
    val testOutput = new ByteArrayOutputStream()
    DownloadBatchHandler(testInputStream, testOutput, null)
  }

  def msg(s: Any): Unit = {
    println(
      s"""
         |----------------------------------------------------------------------
         |$s
         |----------------------------------------------------------------------
      """.stripMargin,
    )
  }
}
