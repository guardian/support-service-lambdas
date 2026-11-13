package com.gu.zuora.sar
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestRequestMaker}
import com.gu.zuora.baton.{BatonZuoraOAuth, BatonZuoraRestConfig}
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import com.gu.zuora.sar.BatonModels.{PerformSarRequest, SarRequest, SarStatusRequest}
import io.circe.syntax._

object ZuoraSarLocalRun extends App {

  case class InputOutputStreams(inputStream: ByteArrayInputStream, outputStream: ByteArrayOutputStream)

  private def requestStreams(request: SarRequest): InputOutputStreams = {
    val jsonRequest = request.asJson.noSpaces
    val testInputStream = new ByteArrayInputStream(jsonRequest.getBytes)
    val testOutputStream = new ByteArrayOutputStream()
    InputOutputStreams(testInputStream, testOutputStream)
  }

  private def runTestZuoraSar(request: SarRequest): Unit = {
    val sarLambdaConfig = ConfigLoader.getSarLambdaConfigTemp
    val zuoraSarHander = ZuoraSarHandler(S3Helper, sarLambdaConfig)
    val streams = requestStreams(request)

    zuoraSarHander.handleRequest(streams.inputStream, streams.outputStream)
    val responseString = new String(streams.outputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  private def runTestPerformZuoraSar(request: SarRequest): Unit = {
    val loadConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val streams = requestStreams(request)
    for {
      zuoraSarConfig <- loadConfig.load[ZuoraSarConfig]
      zuoraRestConfig <- loadConfig.load[BatonZuoraRestConfig]
      accessToken <- BatonZuoraOAuth.getAccessToken(zuoraRestConfig, RawEffects.stage, RawEffects.response)
      requests = ZuoraRestRequestMaker.oauth(RawEffects.response, zuoraRestConfig.baseUrl, accessToken)
      downloadRequests = ZuoraAquaRequestMaker.oauth(
        RawEffects.downloadResponse,
        zuoraRestConfig.baseUrl,
        accessToken,
      )
      zuoraQuerier = ZuoraQuery(requests)
      zuoraHelper = ZuoraSarService(requests, downloadRequests, zuoraQuerier)
    } yield {
      ZuoraPerformSarHandler(zuoraHelper, S3Helper, zuoraSarConfig)
    }.handleRequest(streams.inputStream, streams.outputStream)

    val responseString = new String(streams.outputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  val sarStatusRequest = SarStatusRequest(initiationReference = "testSubjectId")
  val performSarInitiateRequest = PerformSarRequest(
    initiationReference = "testSubjectId",
    subjectEmail = "test@testco.uk",
  )

  runTestZuoraSar(sarStatusRequest)
}
