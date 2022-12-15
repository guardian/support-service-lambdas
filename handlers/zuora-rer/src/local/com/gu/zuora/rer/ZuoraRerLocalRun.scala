package com.gu.zuora.rer
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import com.gu.zuora.rer.circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import com.gu.zuora.rer.BatonModels.{PerformRerRequest, RerRequest, RerStatusRequest}
import io.circe.syntax._

object ZuoraRerLocalRun extends App {

  case class InputOutputStreams(inputStream: ByteArrayInputStream, outputStream: ByteArrayOutputStream)

  private def requestStreams(request: RerRequest): InputOutputStreams = {
    val jsonRequest = request.asJson.noSpaces
    val testInputStream = new ByteArrayInputStream(jsonRequest.getBytes)
    val testOutputStream = new ByteArrayOutputStream()
    InputOutputStreams(testInputStream, testOutputStream)
  }

  private def runTestZuoraRer(request: RerRequest): Unit = {
    val rerLambdaConfig = ConfigLoader.getRerLambdaConfigTemp
    val zuoraRerHander = ZuoraRerHandler(S3Helper, rerLambdaConfig)
    val streams = requestStreams(request)

    zuoraRerHander.handleRequest(streams.inputStream, streams.outputStream)
    val responseString = new String(streams.outputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  private def runTestPerformZuoraRer(request: RerRequest): Unit = {
    val loadZuoraRerConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val loadZuoraRestConfig = LoadConfigModule(RawEffects.stage, GetFromS3.fetchString)
    val streams = requestStreams(request)
    for {
      zuoraRerConfig <- loadZuoraRerConfig[ZuoraRerConfig]
      zuoraRestConfig <- loadZuoraRestConfig[ZuoraRestConfig]
      requests = ZuoraRestRequestMaker(RawEffects.response, zuoraRestConfig)
      downloadRequests = ZuoraAquaRequestMaker(RawEffects.downloadResponse, zuoraRestConfig)
      zuoraQuerier = ZuoraQuery(requests)
      zuoraHelper = ZuoraRerService(requests, downloadRequests, zuoraQuerier)
    } yield {
      ZuoraPerformRerHandler(zuoraHelper, S3Helper, zuoraRerConfig)
    }.handleRequest(streams.inputStream, streams.outputStream)

    val responseString = new String(streams.outputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  val rerStatusRequest = RerStatusRequest(initiationReference = "testSubjectId")
  val performRerInitiateRequest = PerformRerRequest(
    initiationReference = "testSubjectId",
    subjectEmail = "andytest@example.com"
  )

  runTestPerformZuoraRer(performRerInitiateRequest)
//  runTestZuoraRer(rerStatusRequest)
}

