package manualTest

import com.gu.effects.ConfigLoad
import com.gu.util.{ Config, Stage }
import org.scalatest.{ FlatSpec, Ignore, Matchers }

import scala.io.Source
import scala.util.{ Success, Try }

// this test checks the actual config in S3 so it needs credentials.  this means you can only run it manually
// however it does stop you deploying a new version without updating the config first
@Ignore
class ConfigLoaderSystemTest extends FlatSpec with Matchers {

  "loader" should "be able to load the prod config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val prod = ConfigLoad.load(Stage("PROD"))
    validate(prod)
  }

  it should "be able to load the code config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val code: Try[String] = ConfigLoad.load(Stage("CODE"))
    validate(code)
    //code should be(Success(Config(TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("d", "e", "f"), etConfig = ETConfig(Map(0 -> "h"), "i", "j"))))
  }

  def validate(configAttemp: Try[String]) = {
    val con = for {
      a <- configAttemp
      b <- Config.parseConfig(a)
    } yield b
    val loadedOK = con.map(config => ())
    withClue(configAttemp) {
      loadedOK should be(Success(()))
    }
  }

  it should "be able to load the local test config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val configAttempt = Try { Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString }

    validate(configAttempt)
  }

}
