package com.gu.zuora.rer
import java.io.{ByteArrayInputStream, ByteArrayOutputStream}
import com.gu.zuora.rer.circeCodecs._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.LoadConfigModule
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.rer.BatonModels.{PerformRerRequest, RerInitiateRequest, RerRequest, RerStatusRequest}
import io.circe.syntax._

/** Run this app on your local dev machine to test the 'lambda' code against the Zuora DEV sandbox. Note that the code
  * runs on your machine and not in Lambda; you will need to install keys for the `membership` AWS account from Janus.
  *
  * Uncomment the call that you want to make at the bottom of the file.
  */
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
      zuoraQuerier = ZuoraQuery(requests)
      zuoraHelper = ZuoraRerService(requests, zuoraQuerier)
    } yield {
      ZuoraPerformRerHandler(zuoraHelper, S3Helper, zuoraRerConfig)
    }.handleRequest(streams.inputStream, streams.outputStream)

    val responseString = new String(streams.outputStream.toByteArray)
    println("lambda output was:" + responseString)
  }

  val rerStatusRequest = RerStatusRequest(initiationReference = "testSubjectId")
  val rerInitiateRequest = RerInitiateRequest(subjectEmail = "andytest@example.com")
  val performRerInitiateRequest = PerformRerRequest(
    initiationReference = "testSubjectId",
    subjectEmail = "andytest@example.com",
  )

  //  Uncomment one of the calls below that you want to test against the Zuora DEV environment
  // 1. emulate call to ZuoraRerLambda with `initiate` request
  // runTestZuoraRer(rerInitiateRequest)
  // 2. emulate call to ZuoraRerLambda with `status` request
  // runTestZuoraRer(rerStatusRequest)
  // 3. emulate call to ZuoraPerformRerLambda with `initiate` request
  runTestPerformZuoraRer(performRerInitiateRequest)
}
