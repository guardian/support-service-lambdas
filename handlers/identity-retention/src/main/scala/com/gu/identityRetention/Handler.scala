package com.gu.identityRetention

import java.io.{InputStream, OutputStream}
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.google.{BigQueryConfig, BigQueryHelper}
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import okhttp3.{Request, Response}

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runForLegacyTestsSeeTestingMd(
      RawEffects.response,
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context),
    )
  }

  def runForLegacyTestsSeeTestingMd(
      response: Request => Response,
      stage: Stage,
      fetchString: StringFromS3,
      lambdaIO: LambdaIO,
  ) =
    ApiGatewayHandler(lambdaIO)(operationForEffectsBigQuery(stage, fetchString))

  def operationForEffectsBigQuery(
      stage: Stage,
      fetchString: StringFromS3,
  ): ApiGatewayOp[Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    loadConfig[BigQueryConfig].toApiGatewayOp("load bigquery config").map { bigQueryConfig =>
//      val bigQueryHelper = BigQueryHelper(bigQueryConfig)
      val bigQueryHelper = BigQueryHelper()
      IdentityRetentionSteps(bigQueryHelper)
    }
  }
}
