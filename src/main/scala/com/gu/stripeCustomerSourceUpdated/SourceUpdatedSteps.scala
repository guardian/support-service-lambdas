package com.gu.stripeCustomerSourceUpdated

import com.gu.util._
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import okhttp3.{ Request, Response }
import play.api.libs.json.Json

object SourceUpdatedSteps extends Logging {

  def apply(deps: Deps)(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[SourceUpdatedCallout](Json.parse(apiGatewayRequest.body)).toFailableOp
      _ = logger.info(s"received $paymentFailureCallout")
      // TODO... write to zuora
    } yield ()
  }

  object Deps {
    def default(response: Request => Response, config: Config): Deps = {
      Deps()
    }
  }

  case class Deps()

}
