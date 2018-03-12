package com.gu.identityBackfill

import java.time.LocalDate

import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.util.{ Config, Logging }
import okhttp3.{ Request, Response }
import play.api.libs.json.Json

object IdentityBackfillSteps extends Logging {

  def default(now: LocalDate, response: Request => Response, config: Config[ZuoraRestConfig]): ApiGatewayRequest => FailableOp[Unit] = {
    //val zuoraDeps = ZuoraDeps(response, config.zuoraRestConfig)
    new IdentityBackfillSteps().apply
  }

}

class IdentityBackfillSteps() extends Logging {

  def apply(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    println("ap")
    for {
      autoCancelCallout <- Json.fromJson[Seq[String]](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout")
      _ = println(autoCancelCallout)
    } yield ()
  }

}
