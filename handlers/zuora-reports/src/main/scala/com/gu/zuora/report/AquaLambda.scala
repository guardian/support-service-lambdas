package com.gu.zuora.retention

import java.io.{InputStream, OutputStream, OutputStreamWriter}

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, inputFromApiGateway}
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.report.aqua.{QuerierResponse, ZuoraAquaRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads, Writes}
import scalaz.\/

import scala.io.Source
import scala.util.Try

object AquaLambda extends Logging {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def lambdaJsonResponse[RESPONSE](outputStream: OutputStream, response: RESPONSE)(implicit w: Writes[RESPONSE]): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

  def parseRequest[REQUEST](inputStream: InputStream)(implicit r: Reads[REQUEST]): FailableOp[REQUEST] = {
    for {
      jsonString <- Try(Source.fromInputStream(inputStream).mkString).toFailableOp("get data from inpu ").withLogging("lambda request")
      request <- Json.parse(jsonString).validate[REQUEST]
        .toFailableOp().withLogging("parsed lambda request")

    } yield request
  }

  def apply[REQUEST](
    response: Request => Response,
    stage: Stage,
    s3Load: Stage => ConfigFailure \/ String,
    lambdaIO: LambdaIO,
    aquaCall: (Requests, REQUEST) => ClientFailableOp[QuerierResponse]
  )(implicit r: Reads[REQUEST]): Unit = {

    for {
      request <- parseRequest[REQUEST](lambdaIO.inputStream)
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage))
        .withLogging("loaded config")
        .leftMap(_.error)
      zuoraRequests = ZuoraAquaRequestMaker(response, config.stepsConfig.zuoraRestConfig)
      callResponse <- aquaCall(zuoraRequests, request)
    } yield lambdaJsonResponse(lambdaIO.outputStream, callResponse)
  }

}
