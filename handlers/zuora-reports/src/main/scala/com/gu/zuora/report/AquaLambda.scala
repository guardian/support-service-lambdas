package com.gu.zuora.retention

import java.io.{InputStream, OutputStream, OutputStreamWriter}

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{LoadConfig, Stage}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.zuora.report.aqua.{QuerierResponse, ZuoraAquaRequestMaker}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads, Writes}
import scalaz.Scalaz._
import scalaz._

import scala.io.Source
import scala.util.Try

object AquaLambda extends Logging {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  trait LambdaException extends Exception

  object LambdaException {
    def apply(message: String, root: Throwable) = new Exception(message, root) with LambdaException

    def apply(message: String) = new Exception(message) with LambdaException
  }

  def parseRequest[REQUEST](inputStream: InputStream)(implicit r: Reads[REQUEST]): Try[REQUEST] = {
    for {
      jsonString <- Try(Source.fromInputStream(inputStream).mkString)
      request <- Try(Json.parse(jsonString).as[REQUEST])
    } yield request
  }

  def serializeResponse[RESPONSE](outputStream: OutputStream, response: RESPONSE)(implicit w: Writes[RESPONSE]): Unit = {
    val writer = new OutputStreamWriter(outputStream, "UTF-8")
    val jsonResponse = Json.toJson(response)
    logger.info(s"Response will be: \n ${jsonResponse.toString}")
    writer.write(Json.stringify(jsonResponse))
    writer.close()
  }

  def apply[REQUEST](
    response: Request => Response,
    stage: Stage,
    s3Load: Stage => ConfigFailure \/ String,
    lambdaIO: LambdaIO,
    aquaCall: (Requests, REQUEST) => ClientFailableOp[QuerierResponse]
  )(implicit r: Reads[REQUEST]): Unit = {

    val lambdaResponse = for {
      request <- parseRequest[REQUEST](lambdaIO.inputStream).toEither.disjunction
      config <- LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage)).withLogging("loaded config").leftMap(configError => LambdaException(configError.error))
      zuoraRequests = ZuoraAquaRequestMaker(response, config.stepsConfig.zuoraRestConfig)
      callResponse <- aquaCall(zuoraRequests, request).leftMap(error => LambdaException(error.message))
    } yield callResponse

    lambdaResponse match {
      case -\/(exception) => {
        logger.error("terminating lambda with error ", exception)
        throw exception
      }
      case \/-(successResponse) => serializeResponse(lambdaIO.outputStream, successResponse)
    }

  }

}
