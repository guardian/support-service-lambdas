package com.gu.zuora.sar
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import com.gu.zuora.sar.BatonModels.{SarRequest, SarStatusRequest}
import io.circe.syntax._
import circeCodecs._

object ZuoraSarLocalRun extends App {
  def runwith(request: SarRequest): Unit = {
    val sarLambdaConfig = ConfigLoader.getSarLambdaConfigTemp
    val zuoraSarHander = ZuoraSarHandler(sarLambdaConfig)
    val jsonRequest = request.asJson.noSpaces
    val testInputStream = new ByteArrayInputStream(jsonRequest.getBytes)
    val testOutputStream = new ByteArrayOutputStream()
    zuoraSarHander.handleRequest(testInputStream, testOutputStream, null)
    val responseString = new String(testOutputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  val sarStatusRequest = SarStatusRequest(initiationReference = "testSubjectId")

  runwith(sarStatusRequest)
}
