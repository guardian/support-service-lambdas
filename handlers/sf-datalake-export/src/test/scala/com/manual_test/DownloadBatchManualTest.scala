package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.DownloadBatches

//This is just a way to locally run the addSubscription lambda in dev
object DownloadBatchManualTest extends App {
  //todo see how to make "done" optional
  val request =
    """{
      |"jobId" : "7506E000003wKwwQAE",
      |"jobName" : "testJob",
      |"batches" : [{
      | "batchId" : "7516E000002y6GNQAY",
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
