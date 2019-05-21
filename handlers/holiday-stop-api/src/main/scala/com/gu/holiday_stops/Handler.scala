package com.gu.holiday_stops

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.ProductName
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, OWrites}

object Handler extends Logging {

  type SfClient = HttpOp[StringHttpRequest, BodyAsString]

  def generic(sfSteps: SfClient => ApiGatewayRequest => ApiResponse)(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(
      LambdaIO(
        inputStream,
        outputStream,
        context
      )
    )(
        operationForEffects(
          RawEffects.response,
          RawEffects.stage,
          GetFromS3.fetchString,
          sfSteps
        )
      )

  def operationForEffects(
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
    sfSteps: SfClient => ApiGatewayRequest => ApiResponse
  ): ApiGatewayOp[Operation] = {

    val loadConfig = LoadConfigModule(stage, fetchString)

    for {
      sfAuthConfig <- loadConfig[SFAuthConfig].toApiGatewayOp("load sfAuth config")
      sfClient <- SalesforceClient(response, sfAuthConfig).value.toDisjunction.toApiGatewayOp("authenticate with SalesForce")
    } yield Operation.noHealthcheck(sfSteps(sfClient)) //TODO add healthcheck

  }

  def GET(inputStream: InputStream, outputStream: OutputStream, context: Context) =
    generic(stepsGET)(inputStream, outputStream, context)

  def stepsGET(sfClient: HttpOp[StringHttpRequest, BodyAsString])(req: ApiGatewayRequest): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByIdentityIdAndProductNamePrefix(sfClient.wrapWith(JsonHttp.getWithParams))

    implicit val writesHolidayStopRequestGET: OWrites[HolidayStopRequestGET] = Json.writes[HolidayStopRequestGET]
    implicit val writesHolidayStopRequestsGET: OWrites[HolidayStopRequestsGET] = Json.writes[HolidayStopRequestsGET]

    (for {
      identityId <- req.headers.flatMap(_.get("x-identity-id")).toApiGatewayOp("identityID header")
      productNamePrefix <- req.headers.flatMap(_.get("x-product-name-prefix").map(ProductName.apply)).toApiGatewayOp("product name header")
      usersHolidayStopRequests <- lookupOp(identityId, productNamePrefix).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for identity $identityId")
    } yield ApiGatewayResponse(
      "200",
      HolidayStopRequestsGET(usersHolidayStopRequests, productNamePrefix)
    )).apiResponse
  }
}
