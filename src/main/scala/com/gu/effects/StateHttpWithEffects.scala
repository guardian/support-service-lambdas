package com.gu.effects

import java.util.concurrent.TimeUnit

import com.gu.util.Config
import com.gu.util.zuora.Types.{ FailableOp, StateHttp }
import okhttp3.{ OkHttpClient, Request, Response }
import com.gu.util.zuora.Types._

import scala.util.Try

object StateHttpWithEffects extends Logging {

  //  code dependencies
  case class HandlerDeps(
    configAttempt: String => Try[String],
    parseConfig: String => Try[Config]

  )

  val defaultHandlerDeps = HandlerDeps(
    configAttempt = ConfigLoad.load,
    parseConfig = Config.parseConfig
  )

  def apply(deps: HandlerDeps = defaultHandlerDeps): FailableOp[StateHttp] = {
    val stage = System.getenv("Stage")
    logger.info(s"${this.getClass} Lambda is starting up in ${stage}")

    for {
      config <- deps.configAttempt(stage).flatMap(deps.parseConfig).toFailableOp("load config")
    } yield new StateHttp(response, stage, config)

  }

  val response: Request => Response = {
    val restClient = new OkHttpClient().newBuilder()
      .readTimeout(15, TimeUnit.SECONDS)
      .build()

    { request: Request =>
      restClient.newCall(request).execute
    }
  }

}