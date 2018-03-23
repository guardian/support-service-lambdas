package manualTest

import com.gu.effects.ConfigLoad
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.test.EffectsTest
import com.gu.util.{Config, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import scalaz.syntax.std.either._

import scala.util.Try

// this test checks the actual config in S3 so it needs credentials.  this means you can only run it manually
// however it does stop you deploying a new version without updating the config first
class ConfigLoaderSystemTest extends FlatSpec with Matchers {

  "loader" should "be able to load the prod config successfully" taggedAs EffectsTest in {
    val prod = ConfigLoad.load(Stage("PROD"))
    validate(prod, Stage("PROD"))
  }

  it should "be able to load the code config successfully" taggedAs EffectsTest in {
    val code: Try[String] = ConfigLoad.load(Stage("CODE"))
    validate(code, Stage("CODE"))
  }

  def validate(configAttemp: Try[String], stage: Stage) = {
    val con = for {
      a <- configAttemp.toEither.disjunction
      b <- Config.parseConfig[StepsConfig](a)
    } yield b
    val loadedOK = con.map(config => ())
    withClue(configAttemp) {
      loadedOK should be(\/-(()))
      con.toOption.get.stage should be(stage)
    }
  }

  it should "be able to load the local test config successfully" taggedAs EffectsTest in {
    val configAttempt = ConfigLoad.load(Stage("DEV"))

    validate(configAttempt, Stage("DEV"))
  }

}
