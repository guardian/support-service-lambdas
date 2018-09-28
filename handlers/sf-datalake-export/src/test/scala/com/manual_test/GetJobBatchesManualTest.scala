package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.{GetBatches, StartJob}

//This is just a way to locally run the addSubscription lambda in dev
object StartJobManualTest extends App {
  val request =
    """{
      |"jobId" : "7506E000003wKwwQAE",
      |"jobName" : "contacts"
      |}
    """.stripMargin


  println(s"sending request..")
  println(request)

  val testInputStream = new ByteArrayInputStream(request.getBytes)
  val testOutput = new ByteArrayOutputStream()
  GetBatches(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
