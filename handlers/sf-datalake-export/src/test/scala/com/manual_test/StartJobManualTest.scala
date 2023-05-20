package com.manual_test

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.sf_datalake_export.handlers.StartJobHandler
import com.gu.sf_datalake_export.salesforce_bulk_api.BulkApiParams

//This is just a way to locally run the lambda in code
object StartJobManualTest extends App {

  val sfObject = BulkApiParams.contact

  val request =
    s"""{
      |"objectName" : "${sfObject.objectName.value}"
      |}
    """.stripMargin

  println(s"sending request..")
  println(request)

  val testInputStream = new ByteArrayInputStream(request.getBytes)
  val testOutput = new ByteArrayOutputStream()
  StartJobHandler(testInputStream, testOutput, null)

  val response = new String(testOutput.toByteArray)
  println(response)
}
