package com.gu.identityBackfill

import com.gu.identity.IdentityConfig
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestConfig
import play.api.libs.json.{ Json, Reads }

object IdentityBackfillSteps extends Logging {

  case class StepsConfig(identityConfig: IdentityConfig, zuoraRestConfig: ZuoraRestConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def apply(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    println("ap")
    for {
      autoCancelCallout <- Json.fromJson[Seq[String]](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout")
      _ = println(autoCancelCallout)
    } yield ()
  }

}
