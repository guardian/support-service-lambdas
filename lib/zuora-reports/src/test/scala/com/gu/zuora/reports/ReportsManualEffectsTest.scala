package com.gu.zuora.reports

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.reports.aqua.{AquaJobResponse, AquaQuery, AquaQueryRequest, ZuoraAquaRequestMaker}
import com.gu.zuora.reports.dataModel.Batch
import okhttp3.{Request, Response}
import play.api.libs.json.Json

object ReportsManualEffectsTest extends App {

  def getZuoraRequest(response: Request => Response) = for {
    zuoraRestConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[ZuoraRestConfig]
    zuoraRequests = ZuoraAquaRequestMaker(RawEffects.response, zuoraRestConfig)
  } yield zuoraRequests

  case class QuerierTestRequest(id: String, dryRun: Boolean) extends QuerierRequest

  implicit val requestReads = Json.reads[QuerierTestRequest]

  def querierTest(): Unit = {

    def generateTestQuery(request: QuerierTestRequest): AquaQueryRequest = {
      val statements = "SELECT Name FROM Subscription WHERE  id='2c92c0856391fbe001639b8a61d25d7b'"

      val query1 = AquaQuery(
        name = "testQuery",
        query = statements,
      )
      AquaQueryRequest(
        name = "testRequest",
        queries = List(query1),
      )
    }

    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.response)
      request = QuerierTestRequest("2c92c0856391fbe001639b8a61d25d7b", true)
      res <- Querier(generateTestQuery, zuoraRequests)(request).toDisjunction
    } yield {
      res
    }
    println(s"querier response : $response")

  }

  def getResultsTest(): Unit = {
    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.response)
      request = JobResultRequest("2c92c0f8644618e801646a397eff4df9", true, None)
      res <- GetJobResult(zuoraRequests.get[AquaJobResponse])(request).toDisjunction
    } yield {
      res
    }
    println(s"test results response : $response")

  }

  def fetchFileTest(): Unit = {
    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.downloadResponse)
      request = FetchFileRequest(
        "2c92c0f963f800ac0164174918d905f2",
        Nil,
        List(Batch("2c92c08663f7f01701641749196b2a76", "manualTest/SomeTest2")),
        false,
      )
      upload = S3ReportUpload("zuora-retention-code", RawEffects.s3Write) _
      res <- FetchFile(upload, zuoraRequests.getDownloadStream)(request).toDisjunction
    } yield {
      res
    }
    println(s"fetch file response : $response")
  }

  println("Executing manual test for Zuora reports")
  getResultsTest
}
