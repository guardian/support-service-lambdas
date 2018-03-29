package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFail, ClientFailableOp}
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import play.api.libs.json._
import scalaz.Scalaz._

object ZuoraRestRequestMaker extends Logging {

  def apply(zuoraDeps: ZuoraDeps): RestRequestMaker.Requests = {
    import zuoraDeps._
    new RestRequestMaker.Requests(
      Map(
        "apiSecretAccessKey" -> config.password,
        "apiAccessKeyId" -> config.username
      ),
      config.baseUrl + "/", //TODO shouldn't have to add it
      response,
      zuoraIsSuccessful
    )
  }

  def zuoraIsSuccessful(bodyAsJson: JsValue): ClientFailableOp[Unit] = {

    bodyAsJson.validate[ZuoraCommonFields] match {
      case JsSuccess(ZuoraCommonFields(true), _) =>
        ().right
      case JsSuccess(zuoraFailure, _) =>
        logger.error(s"Zuora rejected our call $bodyAsJson")
        ClientFail("Received failure result from Zuora during autoCancellation").left
      case error: JsError => {
        logger.error(s"Failed to read common fields from zuora response: $error. Response body was: \n $bodyAsJson")
        ClientFail("Error when reading common fields from zuora").left
      }
    }
  }

}

