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
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import okhttp3.{Request, Response}
import play.api.libs.json.{Json, OWrites, Reads}

object Handler extends Logging {

  type SfClient = HttpOp[StringHttpRequest, BodyAsString]

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
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
        GetFromS3.fetchString
      )
    )

  def operationForEffects(
    response: Request => Response,
    stage: Stage,
    fetchString: StringFromS3,
  ): ApiGatewayOp[Operation] = {

    val loadConfig = LoadConfigModule(stage, fetchString)

    for {
      sfAuthConfig <- loadConfig[SFAuthConfig].toApiGatewayOp("load sfAuth config")
      sfClient <- SalesforceClient(response, sfAuthConfig).value.toDisjunction.toApiGatewayOp("authenticate with SalesForce")
    } yield Operation.noHealthcheck( //TODO add healthcheck (probably just check connectivity to SF)
      request => (request.httpMethod match { // TODO will need to match against path params too to support edit endpoint
        case Some("GET") => stepsGET _
        case Some("POST") => stepsCREATE _
        case _ => stepsUNSUPPORTED _
      })(request, sfClient))

  }

  def stepsGET(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByIdentityIdAndProductNamePrefix(sfClient.wrapWith(JsonHttp.getWithParams))

    implicit val writesHolidayStopRequestGET: OWrites[HolidayStopRequestEXTERNAL] = Json.writes[HolidayStopRequestEXTERNAL]
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

  def stepsCREATE(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequest(sfClient.wrapWith(JsonHttp.post))

    implicit val readsHolidayStopRequestEXTERNAL: Reads[HolidayStopRequestEXTERNAL] = Json.reads[HolidayStopRequestEXTERNAL]

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestEXTERNAL]()
      identityId <- req.headers.flatMap(_.get("x-identity-id")).toApiGatewayOp("identityID header")
      // TODO verify identity ID can create holiday stop for given sub
      _ <- createOp(HolidayStopRequestEXTERNAL.toSF(requestBody)).toDisjunction.toApiGatewayOp(s"create new Holiday Stop Request for subscription ${requestBody.subscriptionName} (identity $identityId)")
      // TODO handle 'FIELD_CUSTOM_VALIDATION_EXCEPTION' etc back from SF and place in response
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def stepsUNSUPPORTED(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

}
