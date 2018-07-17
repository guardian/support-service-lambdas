package com.gu.zuora.reports

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.handlers.{LambdaException, ParseRequest, SerialiseResponse}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraRestConfig
import play.api.libs.json.{Reads, Writes}
import scalaz.Scalaz._
import scalaz._

object ReportsLambda extends Logging {

  type AquaCall[REQUEST, RESPONSE] = REQUEST => ClientFailableOp[RESPONSE]

  def apply[REQUEST, RESPONSE](
    stage: Stage,
    fetchString: StringFromS3,
    lambdaIO: LambdaIO,
    wireCall: ZuoraRestConfig => AquaCall[REQUEST, RESPONSE]
  )(implicit r: Reads[REQUEST], w: Writes[RESPONSE]): Unit = {

    val lambdaResponse = for {
      request <- ParseRequest[REQUEST](lambdaIO.inputStream).toEither.disjunction
      config <- LoadConfigModule(stage, fetchString)[ZuoraRestConfig].leftMap(configError => LambdaException(configError.error))
      aquaCall = wireCall(config)
      callResponse <- aquaCall(request).toDisjunction.leftMap(error => LambdaException(error.message))
    } yield callResponse

    lambdaResponse match {
      case -\/(exception) => {
        logger.error("terminating lambda with error ", exception)
        throw exception
      }
      case \/-(successResponse) => SerialiseResponse(lambdaIO.outputStream, successResponse)
    }

  }

}
