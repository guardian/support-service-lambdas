package com.gu.zuora.reports

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.zuora.reports.ReportsLambda.StepsConfig
import com.gu.zuora.reports.aqua.{AquaQuery, AquaQueryRequest, ZuoraAquaRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.Json
import scalaz.syntax.std.either._

object ReportsManualEffectsTest extends App {

  def getZuoraRequest(response: Request => Response) = for {
    configAttempt <- S3ConfigLoad.load(Stage("DEV")).toEither.disjunction
    config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
    zuoraRequests = ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
  } yield zuoraRequests

  case class QuerierTestRequest(id: String)

  implicit val requestReads = Json.reads[QuerierTestRequest]

  def querierTest: Unit = {

    def generateTestQuery(request: QuerierTestRequest): AquaQueryRequest = {
      val statements = "SELECT Name FROM Subscription WHERE  id='2c92c0856391fbe001639b8a61d25d7b'"

      val query1 = AquaQuery(
        name = "testQuery",
        query = statements
      )
      AquaQueryRequest(
        name = "testRequest",
        queries = List(query1)
      )
    }

    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.response)
      request = QuerierTestRequest("2c92c0856391fbe001639b8a61d25d7b")
      res <- Querier(generateTestQuery, zuoraRequests)(request)
    } yield {
      res
    }
    println(s"querier response : $response")

  }

  def getResultsTest: Unit = {
    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.response)
      request = JobResultRequest("2c92c0f863ed5f9f0163eefa4abd1de5")
      res <- GetJobResult(zuoraRequests)(request)
    } yield {
      res
    }
    println(s"test results response : $response")

  }

  def fetchFileTest: Unit = {
    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.downloadResponse)
      request = FetchFileRequest(Nil, List(FileInfo("2c92c08563ed59430163eefa4b3815c0", "manualTest/SomeTest2")))
      upload = S3ReportUpload("zuora-reports-dev", "reports", RawEffects.s3Write) _
      res <- FetchFile(upload, zuoraRequests.getDownloadStream)(request)
    } yield {
      res
    }
    println(s"fetch file response : $response")
  }

  println("Executing manual test for Zuora reports")
  getResultsTest
}

