package com.gu.zuora.reports.aqua

import java.util.Base64

import com.gu.util.zuora.{Logging, RestRequestMaker, ZuoraRestConfig}
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import com.gu.util.zuora.aqua.ZuoraAquaResponse
import okhttp3.{Request, Response}
import play.api.libs.json._
import scalaz.Scalaz._

object ZuoraAquaRequestMaker extends Logging {

  def apply(response: Request => Response, config: ZuoraRestConfig): RestRequestMaker.Requests = {
    val credentials = s"${config.username}:${config.password}"
    val encodedCredentials = Base64.getEncoder.encodeToString(credentials.getBytes("UTF-8"))
    new RestRequestMaker.Requests(
      headers = Map(
        "Authorization" -> s"Basic $encodedCredentials"
      ),
      baseUrl = config.baseUrl + "/",
      getResponse = response,
      jsonIsSuccessful = zuoraIsSuccessful
    )
  }

  def zuoraIsSuccessful(bodyAsJson: JsValue): ClientFailableOp[Unit] = {

    bodyAsJson.validate[ZuoraAquaResponse] match {
      case JsSuccess(ZuoraAquaResponse("error", name, errorCode, message, _, _), _) => {
        logger.error(s"Zuora Aqua Api rejected our call $bodyAsJson")
        val codePart = errorCode.map(c => s"error code $c:")
        val messagePart = message.getOrElse("No error message")
        GenericError(s"$codePart $messagePart").left
      }
      case JsSuccess(ZuoraAquaResponse(_, _, _, _, _, _), _) => ().right

      case error: JsError => {
        logger.error(s"Failed to parse Zuora AQuA API response: $error. Response body was: \n $bodyAsJson")
        GenericError("Failed to parse Zuora AQuA API response").left
      }
    }
  }

}

