package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, NotFound, PaymentError}
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.typesafe.scalalogging.LazyLogging
import okhttp3.{Request, Response}
import play.api.libs.json._

object ZuoraRestRequestMaker extends LazyLogging {

  def apply(response: Request => Response, config: ZuoraRestConfig): RestRequestMaker.Requests = {
    new RestRequestMaker.Requests(
      headers = Map(
        "apiSecretAccessKey" -> config.password,
        "apiAccessKeyId" -> config.username,
      ),
      baseUrl = config.baseUrl + "/", // TODO shouldn't have to add it
      getResponse = response,
      jsonIsSuccessful = zuoraIsSuccessful,
    )
  }

  def zuoraIsSuccessful(bodyAsJson: JsValue): ClientFailableOp[Unit] = {

    bodyAsJson.validate[ZuoraResponse] match {
      case JsSuccess(ZuoraSuccess, _) =>
        ClientSuccess(())
      case JsSuccess(ZuoraErrorResponse(reasons), _) => {
        logger.error(s"Zuora rejected our call $bodyAsJson")
        if (reasons.exists(_.code.toString.endsWith("40")))
          NotFound("Received a 'not found' response from Zuora")
        else if (reasons.exists(_.code == 53000060))
          PaymentError(s"Received a payment error from Zuora: $reasons")
        else
          GenericError(s"Received a failure result from Zuora: $reasons")
      }
      case error: JsError => {
        logger.error(s"Failed to read common fields from zuora response: $error. Response body was: \n $bodyAsJson")
        GenericError("Error when reading common fields from zuora")
      }
    }
  }

}
