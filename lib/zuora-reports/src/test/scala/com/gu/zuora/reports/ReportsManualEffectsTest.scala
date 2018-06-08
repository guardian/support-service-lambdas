package com.gu.zuora.reports

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.zuora.reports.ReportsLambda.StepsConfig
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import okhttp3.{Request, Response}
import scalaz.syntax.std.either._

object ReportsManualEffectsTest extends App {

  def getZuoraRequest(response: Request => Response) = for {
    configAttempt <- S3ConfigLoad.load(Stage("DEV")).toEither.disjunction
    config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
    zuoraRequests = ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
  } yield zuoraRequests

  //todo the query format is not defined in reports anymore, we'll have to rethink this tests
  //  def querierTest = {
  //
  //    val expected = QuerierResponse(
  //      jobId = "something",
  //      name = "bla"
  //    )
  //    val response = for {
  //      zuoraRequests <- getZuoraRequest(RawEffects.response)
  //      request = QuerierRequest("testRequest", Seq(Query("testQuery", "SELECT Name FROM Subscription WHERE  id='2c92c0856391fbe001639b8a61d25d7b'")))
  //      res <- Querier(zuoraRequests)(request)
  //    } yield {
  //      res
  //    }
  //    println(s"querier response : $response")
  //
  //  }

  def getResultsTest = {
    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.response)
      request = JobResultRequest("2c92c0f863b81bf20163cb25b5b10a8b")
      res <- GetJobResult(zuoraRequests)(request)
    } yield {
      res
    }
    println(s"test results response : $response")

  }

  def fetchFileTest = {
    val response = for {
      zuoraRequests <- getZuoraRequest(RawEffects.downloadResponse)
      request = FetchFileRequest("2c92c086639207960163cb25b64a009b", "manualTest/SomeTest1.csv")
      upload = S3ReportUpload("zuora-reports-dev", RawEffects.s3Write) _
      res <- FetchFile(upload, zuoraRequests)(request)
    } yield {
      res
    }
    println(s"fetch file response : $response")
  }

  println("Executing manual test for Zuora reports")
  getResultsTest
}

