package com.gu.util.zuora

import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types._
import com.gu.util.zuora.Zuora.ZuoraDeps
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.{ Logging, ZuoraRestConfig }
import okhttp3._
import play.api.libs.json._

import scalaz.Scalaz._
import scalaz.{ Reader, \/ }
import scalaz.syntax.std.boolean._

object ZuoraRestRequestMaker extends Logging {

  def convertResponseToCaseClass[T: Reads](response: Response): ApiResponse \/ T = {
    for {
      _ <- httpIsSuccessful(response)
      bodyAsJson = Json.parse(response.body.string)
      _ <- zuoraIsSuccessful(bodyAsJson)
      result <- toResult[T](bodyAsJson)
    } yield result

  }

  def httpIsSuccessful(response: Response): FailableOp[Unit] = {
    if (response.isSuccessful) {
      ().right
    } else {
      logger.error(s"Request to Zuora was unsuccessful, the response was: \n $response")
      internalServerError("Request to Zuora was unsuccessful").left
    }
  }
  def zuoraIsSuccessful(bodyAsJson: JsValue): FailableOp[Unit] = {

    bodyAsJson.validate[ZuoraCommonFields] match {
      case JsSuccess(ZuoraCommonFields(true), _) =>
        ().right
      case JsSuccess(zuoraFailure, _) =>
        logger.error(s"Zuora rejected our call $bodyAsJson")
        internalServerError("Received failure result from Zuora during autoCancellation").left
      case error: JsError => {
        logger.error(s"Failed to read common fields from zuora response: $error. Response body was: \n $bodyAsJson")
        internalServerError("Error when reading common fields from zuora").left
      }
    }
  }
  def toResult[T: Reads](bodyAsJson: JsValue): FailableOp[T] = {
    bodyAsJson.validate[T] match {
      case success: JsSuccess[T] =>
        success.get.right
      case error: JsError => {
        logger.error(s"Failed to convert Zuora response to case case $error. Response body was: \n $bodyAsJson")
        internalServerError("Error when converting Zuora response to case class").left
      }
    }
  }

  def get[RESP: Reads](path: String): WithDepsFailableOp[ZuoraDeps, RESP] =
    Reader { zuoraDeps: ZuoraDeps =>
      val request = buildRequest(zuoraDeps.config)(path).get().build()
      logger.info(s"Getting $path from Zuora")
      val response = zuoraDeps.response(request)
      convertResponseToCaseClass[RESP](response)
    }.toEitherT

  def put[REQ: Writes, RESP: Reads](req: REQ, path: String): WithDepsFailableOp[ZuoraDeps, RESP] =
    Reader { zuoraDeps: ZuoraDeps =>
      val body = RequestBody.create(MediaType.parse("application/json"), Json.toJson(req).toString)
      val request = buildRequest(zuoraDeps.config)(path).put(body).build()
      logger.info(s"Attempting to $path with the following command: $req")
      val response = zuoraDeps.response(request)
      convertResponseToCaseClass[RESP](response)
    }.toEitherT

  def buildRequest(config: ZuoraRestConfig)(route: String): Request.Builder =
    new Request.Builder()
      .addHeader("apiSecretAccessKey", config.password)
      .addHeader("apiAccessKeyId", config.username)
      .url(s"${config.baseUrl}/$route")

}
