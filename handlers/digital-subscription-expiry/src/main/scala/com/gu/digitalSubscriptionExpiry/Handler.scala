package com.gu.digitalSubscriptionExpiry

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest}
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.util.{Config, Logging}
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import org.joda.time.DateTime
import play.api.libs.json.{Json, Reads}

import scalaz.-\/

object Handler extends Logging {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

  case class StepsConfig(
    zuoraRestConfig: ZuoraRestConfig
  )
  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation: Config[StepsConfig] => Operation =
      config => {
        def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
          val calloutParsed: Option[DigitalSubscriptionExpiryRequest] = Json.fromJson[DigitalSubscriptionExpiryRequest](Json.parse(apiGatewayRequest.body)).asOpt

          logger.info(s"Parsed request as: $calloutParsed")

          val responseJson = Json.toJson(getZuoraExpiry())

          -\/(ApiResponse("200", new Headers, Json.prettyPrint(responseJson)))
        }
        Operation.noHealthcheck(steps, false)
      }
    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

  def getZuoraExpiry() = DigitalSubscriptionExpiryResponse(Expiry(
    expiryDate = DateTime.now(),
    expiryType = ExpiryType.SUB,
    subscriptionCode = None,
    provider = None
  ))
}

