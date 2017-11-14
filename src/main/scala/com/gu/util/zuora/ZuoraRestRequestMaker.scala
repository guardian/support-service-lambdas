package com.gu.util.zuora

import com.gu.effects.Logging
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.zuora.Types.{ ZuoraOp, ZuoraReader }
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import okhttp3._
import play.api.libs.json._

import scalaz.Scalaz._
import scalaz.{ EitherT, Reader, \/ }

object ZuoraRestRequestMaker extends Logging {

  def convertResponseToCaseClass[T](response: Response)(implicit r: Reads[T]): ApiResponse \/ T = {
    if (response.isSuccessful) {
      val bodyAsJson = Json.parse(response.body.string)
      bodyAsJson.validate[ZuoraCommonFields] match {
        case JsSuccess(ZuoraCommonFields(true), _) =>
          bodyAsJson.validate[T] match {
            case success: JsSuccess[T] => success.get.right
            case error: JsError => {
              logger.info(s"Failed to convert Zuora response to case case. Response body was: \n ${bodyAsJson}")
              internalServerError("Error when converting Zuora response to case class").left
            }
          }
        case JsSuccess(zuoraFailure, _) =>
          logger.error(s"Zuora rejected our call $bodyAsJson")
          internalServerError("Received failure result from Zuora during autoCancellation").left
        case error: JsError => {
          logger.info(s"Failed to convert Zuora response to case case. Response body was: \n ${bodyAsJson}")
          internalServerError("Error when converting Zuora response to case class").left
        }
      }

    } else {
      logger.error(s"Request to Zuora was unsuccessful, the response was: \n $response")
      internalServerError("Request to Zuora was unsuccessful").left
    }
  }

  def get[RESP](path: String)(implicit r: Reads[RESP]): ZuoraOp[RESP] = EitherT[ZuoraReader, ApiResponse, RESP](Reader { zhttp =>
    val request = zhttp.buildRequest(path).get().build()
    logger.info(s"Getting $path from Zuora")
    val response = zhttp.response(request)
    convertResponseToCaseClass[RESP](response)
  })

  def put[REQ, RESP](req: REQ, path: String)(implicit tjs: Writes[REQ], r: Reads[RESP]): ZuoraOp[RESP] = EitherT[ZuoraReader, ApiResponse, RESP](Reader { zhttp =>
    val body = RequestBody.create(MediaType.parse("application/json"), Json.toJson(req).toString)
    val request = zhttp.buildRequest(path).put(body).build()
    logger.info(s"Attempting to $path with the following command: $req")
    val response = zhttp.response(request)
    convertResponseToCaseClass[RESP](response)
  })

}
