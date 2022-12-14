package com.gu.util.handlers

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import play.api.libs.json.{Reads, Writes}

import scala.util.{Failure, Success, Try}

object JsonHandler extends Logging {

  def apply[REQUEST, RESPONSE](
      lambdaIO: LambdaIO,
      operation: REQUEST => Try[RESPONSE],
  )(implicit r: Reads[REQUEST], w: Writes[RESPONSE]): Unit = {

    val lambdaResponse = for {
      request <- ParseRequest[REQUEST](lambdaIO.inputStream)
      callResponse <- operation(request)
    } yield callResponse

    lambdaResponse match {
      case Failure(exception) => {
        logger.error("terminating lambda with error ", exception)
        throw exception
      }
      case Success(successResponse) => SerialiseResponse(lambdaIO.outputStream, successResponse)
    }

  }

}
