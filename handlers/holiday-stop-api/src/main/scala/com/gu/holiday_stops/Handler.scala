package com.gu.holiday_stops

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestId, ProductName, SubscriptionName}
import com.gu.salesforce.holiday_stops.{SalesforceHolidayStopRequest, SalesforceSFSubscription}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.BodyAsString
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import okhttp3.{Request, Response}
import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail
import play.api.libs.json.{Format, Json, Reads}

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
        case Some("GET") => request.queryStringParameters match {
          case Some(_) => stepsForPotentialHolidayStop _
          case None => stepsToListExisting _
        }
        case Some("POST") => stepsToCreate _
        case Some("DELETE") => stepsToDelete _
        case _ => unsupported _
      })(request, sfClient))

  }

  private val HEADER_IDENTITY_ID = "x-identity-id"
  private val HEADER_PRODUCT_NAME_PREFIX = "x-product-name-prefix"

  case class PotentialHolidayStopParams(startDate: LocalDate, endDate: LocalDate)
  def stepsForPotentialHolidayStop(req: ApiGatewayRequest, unused: SfClient): ApiResponse = {
    implicit val formatLocalDateAsSalesforceDate: Format[LocalDate] = SalesforceHolidayStopRequest.formatLocalDateAsSalesforceDate
    implicit val readsPotentialHolidayStopParams: Reads[PotentialHolidayStopParams] = Json.reads[PotentialHolidayStopParams]
    (for {
      productNamePrefix <- req.headers.flatMap(_.get(HEADER_PRODUCT_NAME_PREFIX)).toApiGatewayOp("identityID header")
      params <- req.queryParamsAsCaseClass[PotentialHolidayStopParams]()
    } yield ApiGatewayResponse(
      "200",
      ActionCalculator.publicationDatesToBeStopped(params.startDate, params.endDate, ProductName(productNamePrefix))
    )).apiResponse
  }

  case class GetPathParams(subscriptionName: Option[SubscriptionName])

  def stepsToListExisting(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByIdentityIdAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))

    val extractOptionalSubNameOp: ApiGatewayOp[Option[SubscriptionName]] = req.pathParameters match {
      case Some(_) => req.pathParamsAsCaseClass[GetPathParams]()(Json.reads[GetPathParams]).map(_.subscriptionName)
      case None => ContinueProcessing(None)
    }

    val optionalProductNamePrefix = req.headers.flatMap(_.get(HEADER_PRODUCT_NAME_PREFIX).map(ProductName.apply))

    (for {
      identityId <- req.headers.flatMap(_.get(HEADER_IDENTITY_ID)).toApiGatewayOp("identityID header")
      optionalSubName <- extractOptionalSubNameOp
      usersHolidayStopRequests <- lookupOp(identityId, optionalSubName).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for identity $identityId")
    } yield ApiGatewayResponse(
      "200",
      GetHolidayStopRequests(usersHolidayStopRequests, optionalProductNamePrefix)
    )).apiResponse
  }

  def stepsToCreate(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val verifyIdentityIdOwnsSubOp = SalesforceSFSubscription.SubscriptionForSubscriptionNameAndIdentityID(sfClient.wrapWith(JsonHttp.getWithParams))
    val createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestPartial]()
      identityId <- req.headers.flatMap(_.get(HEADER_IDENTITY_ID)).toApiGatewayOp("identityID header")
      maybeMatchingSub <- verifyIdentityIdOwnsSubOp(requestBody.subscriptionName, identityId).toDisjunction.toApiGatewayOp(s"fetching subscriptions for user with identityID $identityId")
      matchingSub <- maybeMatchingSub.toApiGatewayOp(s"user with identityID $identityId does not own ${requestBody.subscriptionName.value}")
      _ <- createOp(CreateHolidayStopRequestWithDetail.buildBody(requestBody.start, requestBody.end, matchingSub)).toDisjunction.toApiGatewayOp(s"create new Holiday Stop Request for subscription ${requestBody.subscriptionName} (identity $identityId)")
      // TODO nice to have - handle 'FIELD_CUSTOM_VALIDATION_EXCEPTION' etc back from SF and place in response
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  case class DeletePathParams(subscriptionName: SubscriptionName, holidayStopRequestId: HolidayStopRequestId)
  def stepsToDelete(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByIdentityIdAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val deleteOp = SalesforceHolidayStopRequest.DeleteHolidayStopRequest(sfClient.wrapWith(JsonHttp.deleteWithStringResponse))

    (for {
      identityId <- req.headers.flatMap(_.get(HEADER_IDENTITY_ID)).toApiGatewayOp("identityID header")
      pathParams <- req.pathParamsAsCaseClass[DeletePathParams]()(Json.reads[DeletePathParams])
      existingForUser <- lookupOp(identityId, None).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for identity $identityId")
      _ = existingForUser.exists(_.Id == pathParams.holidayStopRequestId).toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden("not your holiday stop"))
      _ <- deleteOp(pathParams.holidayStopRequestId).toDisjunction.toApiGatewayOp(s"delete Holiday Stop Request for subscription ${pathParams.subscriptionName.value} identity $identityId")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def unsupported(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

}