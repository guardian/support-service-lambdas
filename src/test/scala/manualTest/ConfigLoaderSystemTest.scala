package manualTest

import com.gu.util.{ Config, ETConfig, TrustedApiConfig, ZuoraRestConfig }
import org.scalatest.{ FlatSpec, Ignore, Matchers }

import scala.util.Success

// this test checks the actual config in S3 so it needs credentials.  this means you can only run it manually
// however it does stop you deploying a new version without updating the config first
@Ignore
class ConfigLoaderSystemTest extends FlatSpec with Matchers {

  "loader" should "be able to load the prod config successfully" in {
    //    val requestAuth = Some(RequestAuth(apiClientId = "validUser", apiToken = "ndjashjkhajshs"))
    //    assert(credentialsAreValid(requestAuth, trustedApiConfig) == false)
    val prod = Config.load("PROD")
    prod should be(Success(Config(TrustedApiConfig("a", "b", "c"), zuoraRestConfig = ZuoraRestConfig("d", "e", "f"), etConfig = ETConfig(Map(0 -> "h"), "i", "j"))))
  }

}
