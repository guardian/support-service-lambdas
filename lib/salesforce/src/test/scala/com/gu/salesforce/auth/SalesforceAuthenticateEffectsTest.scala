package com.gu.salesforce.auth

import com.gu.effects.{RawEffects, S3ConfigLoad}
import com.gu.salesforce.auth.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types._
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{Json, Reads}
import scalaz.\/-

class SalesforceAuthenticateEffectsTest extends FlatSpec with Matchers {

  case class StepsConfig(
    sfConfig: SFAuthConfig
  )
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      configAttempt <- S3ConfigLoad.load(Stage("DEV")).toApiGatewayOp("load config")
      config <- LoadConfig.parseConfig[StepsConfig](configAttempt).toApiGatewayOp("parse config")
      identityId <- SalesforceAuthenticate.doAuth(RawEffects.response, config.stepsConfig.sfConfig)
    } yield {
      identityId
    }
    withClue(s"wrong result: $actual") {
      actual.toDisjunction match {
        case \/-(SalesforceAuth(token, instanceUrl)) =>
          token should not be ("")
          token.length > 20 should be(true)
          instanceUrl should startWith("https://")
        case _ => fail(s"wrong result")
      }
    }
  }

}
