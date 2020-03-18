package com.gu.zuora.sar
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import com.gu.zuora.sar.BatonModels.{PerformSarRequest, SarRequest, SarStatusRequest}
import io.circe.syntax._

object ZuoraSarLocalRun extends App {
  def runwith(request: SarRequest): Unit = {
    val sarLambdaConfig = ConfigLoader.getSarLambdaConfigTemp
//    val zuoraSarHander = ZuoraSarHandler(sarLambdaConfig)
    val jsonRequest = request.asJson.noSpaces
    val testInputStream = new ByteArrayInputStream(jsonRequest.getBytes)
    val testOutputStream = new ByteArrayOutputStream()
    val loadZuoraSarConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val loadZuoraRestConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    for {
      zuoraSarConfig <- loadZuoraSarConfig[ZuoraSarConfig]
      zuoraRestConfig <- loadZuoraRestConfig[ZuoraRestConfig]
      requests = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      downloadRequests = ZuoraAquaRequestMaker(RawEffects.downloadResponse, zuoraRestConfig)
      zuoraQuerier = ZuoraQuery(requests)
      zuoraHelper = ZuoraSarService(requests, downloadRequests, zuoraQuerier)
    } yield {
      ZuoraPerformSarHandler(zuoraHelper, zuoraSarConfig)
    }.handleRequest(testInputStream, testOutputStream)

//    zuoraSarHander.handleRequest(testInputStream, testOutputStream)
    val responseString = new String(testOutputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  val sarStatusRequest = SarStatusRequest(initiationReference = "testSubjectId")
  val performSarInitiateRequest = PerformSarRequest(
    initiationReference = "testSubjectId",
    subjectEmail = "test@testco.uk"
  )
  runwith(sarStatusRequest)
}

