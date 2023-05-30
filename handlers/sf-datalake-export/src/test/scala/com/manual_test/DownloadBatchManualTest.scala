package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.handlers.DownloadBatchHandler

//This is just a way to locally run the lambda in code
object DownloadBatchManualTest extends App {
  val request =
    """{
      |"jobId" : "7506E000004KnUgQAK",
      |"jobName" : "Contact_2018-11-26",
      |"objectName" : "Contact",
      |"uploadToDataLake" : false,
      |"batches" : [{
      | "batchId" : "7516E000003EWUIQA4",
      | "state" : "Completed"
      | }
      | ]
      |}
    """.stripMargin

  println(s"sending request..")
  println(request)

  val testInputStream = new ByteArrayInputStream(request.getBytes)
  val testOutput = new ByteArrayOutputStream()
  DownloadBatchHandler(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
