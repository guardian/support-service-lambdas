package com.gu.cancellation.sf_cases

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.cancellation.sf_cases.TypeConvert._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceReads._
import com.gu.salesforce.{SFAuthConfig, SalesforceClient}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import okhttp3.{Request, Response}

object Handler extends Logging {

  type SfClient = HttpOp[StringHttpRequest, BodyAsString]
  type HeadersOption = Option[Map[String, String]]

  final case class IdentityId(value: String) extends AnyVal

  def router(sfClient: SfClient)(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    (apiGatewayRequest.headers.map(_("x-identity-id")).map(IdentityId), apiGatewayRequest) match {

      case (Some(identityId), ApiGatewayRequest(Some("POST"), _, _, _, _, _)) =>
        RaiseCase.steps(sfClient)(apiGatewayRequest, identityId)

      case (Some(identityId), ApiGatewayRequest(Some("PATCH"), _, _, _, _, _)) =>
        UpdateCase.steps(sfClient)(apiGatewayRequest, identityId)

      case _ => ApiGatewayResponse.badRequest("unsupported")

    }
  }

  def handle(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(
      LambdaIO(inputStream, outputStream, context),
    )(
      operationForEffects(
        router,
        RawEffects.response,
        RawEffects.stage,
        GetFromS3.fetchString,
      ),
    )

  def operationForEffects(
      steps: SfClient => ApiGatewayRequest => ApiResponse,
      response: Request => Response,
      stage: Stage,
      fetchString: StringFromS3,
  ): ApiGatewayOp[Operation] = {

    for {
      sfConfig <- LoadConfigModule(stage, fetchString)(SFAuthConfig.location, sfAuthConfigReads).toApiGatewayOp(
        "load SF config",
      )
      sfClient <- SalesforceClient(response, sfConfig).value.toApiGatewayOp("Failed to authenticate with Salesforce")
    } yield Operation
      .noHealthcheck( // checking connectivity to SF is sufficient healthcheck so no special steps required
        steps(sfClient),
      )

  }
}
