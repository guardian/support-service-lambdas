package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.handlers.EndJobHandler

//This is just a way to locally run the lambda in code
object EndJobManualTest extends App {
  val request =
    """{
      | "jobName" : "Contact_2019-08-05",
      | "objectName" : "Contact",
      | "uploadToDataLake" : false,
      | "jobId" : "7503E000006JRNsQAO"
      |}
    """.stripMargin

  println(s"sending request..")
  println(request)

  val testInputStream = new ByteArrayInputStream(request.getBytes)
  val testOutput = new ByteArrayOutputStream()
  EndJobHandler(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
