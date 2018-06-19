package com.gu.zuora.retention.updateAccounts

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.{Config, LoadConfig, Stage}
import com.gu.util.handlers.{BaseHandler, LambdaException}
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.retention.S3Iterator
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/, \/-}
import UpdateAccountsResponse._
import UpdateAccountsRequest._

import scala.util.{Failure, Success, Try}

object Handler {

  case class StepsConfig(zuoraRestConfig: ZuoraRestConfig)

  implicit val stepsConfigReads: Reads[StepsConfig] = Json.reads[StepsConfig]

  //TODO SEE IF THERE'S A BETTER WAY TO DO THIS..
  def toTry(res: ConfigFailure \/ Config[StepsConfig]) = res match {
    case -\/(configError) => Failure(LambdaException(configError.error))
    case \/-(config) => Success(config)
  }
  type SetDoNotProcess = String => ClientFailableOp[Unit]
  type GetRemainingTime = () => Int
  def operation(
    response: Request => Response,
    stage: Stage,
    s3Load: Stage => ConfigFailure \/ String,
    s3Iterator: String => Try[Iterator[String]],
    getRemainingTimeInMsec: () => Int,
    updateAccounts: (SetDoNotProcess, GetRemainingTime) => AccountIdIterator => Try[UpdateAccountsResponse]
  )(request: UpdateAccountsRequest): Try[UpdateAccountsResponse] = for {
    config <- toTry(LoadConfig.default[StepsConfig](implicitly)(stage, s3Load(stage)))
    zuoraRequests = ZuoraRestRequestMaker(response, config.stepsConfig.zuoraRestConfig)
    linesIterator <- s3Iterator(request.uri)
    accountIdsIterator <- AccountIdIterator(linesIterator, request.skipTo.getOrElse(0))
    setDoNotProcess = SetDoNotProcess(zuoraRequests)_
    wiredUpdateAccounts = UpdateAccounts(setDoNotProcess, getRemainingTimeInMsec) _
    response <- wiredUpdateAccounts(accountIdsIterator)
  } yield (response)

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val getRemainingTime = context.getRemainingTimeInMillis _

    val s3Iterator = S3Iterator.apply(RawEffects.fetchContent) _
    val wiredOp = operation(
      RawEffects.response,
      RawEffects.stage,
      RawEffects.s3Load,
      s3Iterator,
      getRemainingTime,
      UpdateAccounts.apply
    ) _
    BaseHandler(
      lambdaIO = LambdaIO(inputStream, outputStream, context),
      operation = wiredOp
    )
  }
}

