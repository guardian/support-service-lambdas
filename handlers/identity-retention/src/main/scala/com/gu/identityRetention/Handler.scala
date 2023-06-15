package com.gu.identityRetention

import java.io.{InputStream, OutputStream}
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.google.{BigQueryConfig, BigQueryHelper}
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    run(
      RawEffects.stage,
      GetFromS3.fetchString,
      LambdaIO(inputStream, outputStream, context),
    )
  }

  def run(
      stage: Stage,
      fetchString: StringFromS3,
      lambdaIO: LambdaIO,
  ) =
    ApiGatewayHandler(lambdaIO)(operationForEffects(stage, fetchString))

  def operationForEffects(
      stage: Stage,
      fetchString: StringFromS3,
  ): ApiGatewayOp[Operation] = {
    val loadConfig = LoadConfigModule(stage, fetchString)
    loadConfig[BigQueryConfig].toApiGatewayOp("load bigquery config").map { bigQueryConfig =>
      val bigQueryHelper = BigQueryHelper(bigQueryConfig)
      IdentityRetentionSteps(bigQueryHelper)
    }
  }

  def runForLegacyTestsSeeTestingMd(lambdaIO: LambdaIO) =
    ApiGatewayHandler(lambdaIO)(ContinueProcessing(IdentityRetentionSteps(BigQueryHelper())))

}
