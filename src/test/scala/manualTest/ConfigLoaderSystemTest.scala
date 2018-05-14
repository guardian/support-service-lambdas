package manualTest

import com.gu.effects.S3ConfigLoad
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.test.EffectsTest
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfig, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{\/, \/-}

// this test checks the actual config in S3 so it needs credentials.  this means you can only run it manually
// however it does stop you deploying a new version without updating the config first
class ConfigLoaderSystemTest extends FlatSpec with Matchers {

  "loader" should "be able to load the prod config successfully" taggedAs EffectsTest in {
    val prod = S3ConfigLoad.load(Stage("PROD"))
    validate(prod, Stage("PROD"))
  }

  it should "be able to load the code config successfully" taggedAs EffectsTest in {
    val code: ConfigFailure \/ String = S3ConfigLoad.load(Stage("CODE"))
    validate(code, Stage("CODE"))
  }

  def validate(configAttempt: ConfigFailure \/ String, stage: Stage) = {
    val con = for {
      a <- configAttempt
      b <- LoadConfig.parseConfig[StepsConfig](a)
    } yield b
    val loadedOK = con.map(config => ())
    withClue(configAttempt) {
      loadedOK should be(\/-(()))
      con.toOption.get.stage should be(stage)
    }
  }

  it should "be able to load the local test config successfully" taggedAs EffectsTest in {
    val configAttempt = S3ConfigLoad.load(Stage("DEV"))

    validate(configAttempt, Stage("DEV"))
  }

}
