package com.gu.zuora.reports.aqua

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.zuora.reports.AquaLambda.StepsConfig
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/}
import scalaz.syntax.std.either._

//TODO SEE HOW TO DO EFFECT TESTS FOR REPORT QUERIES SINCE THEY ALL DEPEND ON THIS ONE
class QuerierEffectsTest extends FlatSpec with Matchers {
  it should "execute submit query" taggedAs EffectsTest in {

    val expected = QuerierResponse(
      jobId = "something",
      status = "bla"
    )
    val actual = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt)
      zuoraRequests = ZuoraAquaRequestMaker(RawEffects.response, config.stepsConfig.zuoraRestConfig)
      val request = QuerierRequest("testRequest", Seq(Query("testQuery", "SELECT Id FROM Subscription WHERE  id='123'")))
      res <- Querier(zuoraRequests, request)
    } yield {
      res
    }
    actual.map(_.status) should be(-\/("submitted"))
  }
}
