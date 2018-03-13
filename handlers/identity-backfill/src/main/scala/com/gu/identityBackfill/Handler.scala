package com.gu.identityBackfill

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.zuora.ZuoraRestConfig

object Handler {

  def default(rawEffects: RawEffects) =
    ApiGatewayHandler(rawEffects.stage, rawEffects.s3Load, { config: Config[ZuoraRestConfig] =>
      IdentityBackfillSteps.default(rawEffects.now(), rawEffects.response, config)
    })

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    default(RawEffects.createDefault)(inputStream, outputStream, context)
  }
}
