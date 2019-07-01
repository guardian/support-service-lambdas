package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.handlers.GetBatchesHandler
import play.api.libs.json._

object EndToEndManualTest extends App {

  case class Batch(batchId: String, state: String)

  case class Batches(jobId: String, jobName: String, objectName: String, jobStatus: String, batches: Seq[Batch])

  implicit val batchFormat = Json.format[Batch]
  implicit val batchesWrites = Json.format[Batches]


  def getBatches = {
    val request =
      """{
        |"jobId" : "7503E0000063jW3QAI",
        |"jobName" : "Contact_2019-06-30",
        |"objectName" : "Contact",
        |"uploadToDataLake" : false
        |}
      """.stripMargin

    println(s"sending request..")
    println(request)

    val testInputStream = new ByteArrayInputStream(request.getBytes)
    val testOutput = new ByteArrayOutputStream()
    GetBatchesHandler(testInputStream, testOutput, null)

    Json.parse(testOutput.toByteArray).as[Batches]
  }
}
