package manualTest

import com.gu.effects.RawEffects
import com.gu.identity.GetByEmail.EmailAddress
import com.gu.identity.{ GetByEmail, IdentityClientDeps }
import com.gu.identityBackfill.IdentityBackfillSteps.IdentityBackfillDeps.StepsConfig
import com.gu.util.{ Config, Logging }

import scala.io.Source
import scala.util.Try
import scalaz.syntax.std.either._

// run this manually
object GetByEmailSystemTest extends App with Logging {

  for {
    configAttempt <- Try {
      Source.fromFile("/etc/gu/payment-failure-lambdas.private.json").mkString
    }.toEither.disjunction.withLogging("fromFile")
    config <- Config.parseConfig[StepsConfig](configAttempt).withLogging("parseConfig")
    deps = IdentityClientDeps(RawEffects.createDefault.response, config.stepsConfig.identityConfig)
    identityId <- GetByEmail(deps)(EmailAddress("john.duffell@guardian.co.uk")).withLogging("GetByEmail")
  } yield {
    println(s"result for getbyemail:::::: $identityId")
  }

}
