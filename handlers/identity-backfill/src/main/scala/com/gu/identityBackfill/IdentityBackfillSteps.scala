package com.gu.identityBackfill

import com.gu.identity.GetByEmail.EmailAddress
import com.gu.identity.{ GetByEmail, IdentityConfig }
import com.gu.identityBackfill.IdentityBackfillSteps.WireModel.IdentityBackfillRequest
import com.gu.util.Logging
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse }
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraRestConfig
import okhttp3.{ Request, Response }
import play.api.libs.json.{ Json, Reads }

object IdentityBackfillSteps extends Logging {

  case class StepsConfig(identityConfig: IdentityConfig, zuoraRestConfig: ZuoraRestConfig)
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  object WireModel {

    case class IdentityBackfillRequest(emailAddress: String)
    implicit val identityBackfillRequest: Reads[IdentityBackfillRequest] = Json.reads[IdentityBackfillRequest]

  }

  def fromRequest(identityBackfillRequest: IdentityBackfillRequest): EmailAddress = {
    EmailAddress(identityBackfillRequest.emailAddress)
  }

  def apply(config: StepsConfig, getResponse: Request => Response)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    println("ap")
    for {
      autoCancelCallout <- Json.fromJson[IdentityBackfillRequest](Json.parse(apiGatewayRequest.body)).toFailableOp.withLogging("zuora callout")
      _ = println(autoCancelCallout)
      aaa = fromRequest(autoCancelCallout)
      bbb <- GetByEmail(aaa)(getResponse, config.identityConfig).leftMap(a => ApiGatewayResponse.internalServerError(a.toString))
      _ = println(bbb)
    } yield ()
  }

}
