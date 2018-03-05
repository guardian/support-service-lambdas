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
    val prod = ConfigLoad.load(Stage("PROD"))
    validate(prod, Some(true))
  }

  it should "be able to load the code config successfully" in {
    val code: Try[String] = ConfigLoad.load(Stage("CODE"))
    validate(code, None)
  }

  def validate(configAttemp: Try[String], verificationStatus: Option[Boolean]) = {
    val con = for {
      a <- configAttemp
      b <- Config.parseConfig(a)
    } yield b
    val loadedOK = con.map(config => ())
    withClue(configAttemp) {
      loadedOK should be(Success(()))
      verificationStatus.foreach {
        expected => con.get.stripeConfig.signatureChecking should be(expected)
      }
    }
  }

  it should "be able to load the local test config successfully" in {
    val configAttempt = Try { Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString }

    validate(configAttempt, None)
  }

}
