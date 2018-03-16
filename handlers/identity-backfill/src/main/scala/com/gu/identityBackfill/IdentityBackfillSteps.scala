package com.gu.identityBackfill

import java.time.LocalDate

import com.gu.identity.IdentityConfig
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.util.{ Config, Logging }
import okhttp3.{ Request, Response }
import play.api.libs.json.{ Json, Reads }

object IdentityBackfillSteps extends Logging {

  case class IdentityBackfillDeps()

  object IdentityBackfillDeps extends Logging {

    case class StepsConfig(identityConfig: IdentityConfig, zuoraRestConfig: ZuoraRestConfig)
    implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

    def default(now: LocalDate, response: Request => Response, config: Config[StepsConfig]): IdentityBackfillDeps = {
      new IdentityBackfillDeps()
    }

  }

  def apply(identityBackfillDeps: IdentityBackfillDeps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    println("ap")
    for {
      autoCancelCallout <- Json.fromJson[Seq[String]](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout")
      _ = println(autoCancelCallout)
    } yield ()
  }

}
