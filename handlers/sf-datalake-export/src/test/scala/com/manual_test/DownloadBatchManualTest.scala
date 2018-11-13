package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.DownloadBatches

//This is just a way to locally run the lambda in dev
object DownloadBatchManualTest extends App {
  val request =
    """{
      |"jobId" : "7506E000004EnRoQAK",
      |"jobName" : "sfSubscriptions",
      |"batches" : [{
      | "batchId" : "7516E000003DjZnQAK",
      | "state" : "Completed"
      | }
      | ]
      |}
    """.stripMargin

  println(s"sending request..")
  println(request)

  val testInputStream = new ByteArrayInputStream(request.getBytes)
  val testOutput = new ByteArrayOutputStream()
  DownloadBatches(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
