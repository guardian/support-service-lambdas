package com.gu.holiday_stops

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestId, ProductName, SubscriptionName}
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact._
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
import play.api.libs.json.{Format, Json, Reads}
import scalaz.{-\/, \/, \/-}

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

  val POTENTIAL_PROXY_RESOURCE_PATH = "/potential"
  val GET_ALL_AND_CREATE_PROXY_RESOURCE_REGEX = """/hsr.*""".r

  def operationForEffects(response: Request => Response, stage: Stage,
                          fetchString: StringFromS3): ApiGatewayOp[Operation] = {

    val loadConfig = LoadConfigModule(stage, fetchString)

    for {
      sfAuthConfig <- loadConfig[SFAuthConfig].toApiGatewayOp("load sfAuth config")
      sfClient <- SalesforceClient(response, sfAuthConfig).value.toDisjunction.toApiGatewayOp("authenticate with SalesForce")
    } yield Operation.noHealthcheck( // checking connectivity to SF is sufficient healthcheck so no special steps required
      request => validateRequestAndCreateSteps(request)(request, sfClient)
    )
  }

  private def validateRequestAndCreateSteps(request: ApiGatewayRequest) = {
    (for {
      httpMethod <- validateMethod(request.httpMethod)
      path <- validatePath(request.path)
    } yield createSteps(httpMethod, path)).fold(
      { errorMessage: String =>
        badrequest(errorMessage) _
      },
      identity
    )
  }

  private def createSteps(httpMethod: String, path: String) = {
    path match {
      case POTENTIAL_PROXY_RESOURCE_PATH =>
        httpMethod match {
          case "GET" => stepsForPotentialHolidayStop _
          case _ => unsupported _
        }
      case GET_ALL_AND_CREATE_PROXY_RESOURCE_REGEX() =>
        httpMethod match {
          case "GET" => stepsToListExisting _
          case "POST" => stepsToCreate _
          case "DELETE" => stepsToDelete _
          case _ => unsupported _
        }
      case _ =>
        notfound _
    }
  }

  private def validateMethod(method: Option[String]): String \/ String = {
    method match {
      case Some(method) => \/-(method)
      case None => -\/("Http method is required")
    }
  }

  private def validatePath(path: Option[String]): String \/ String = {
    path match {
      case Some(method) => \/-(method)
      case None => -\/("Path is required")
    }
  }

  val HEADER_IDENTITY_ID = "x-identity-id"
  val HEADER_SALESFORCE_CONTACT_ID = "x-salesforce-contact-id"
  val HEADER_PRODUCT_NAME_PREFIX = "x-product-name-prefix"

  def extractContactFromHeaders(headers: Option[Map[String, String]]): ApiGatewayOp[Contact] = headers.flatMap(_.toList.collectFirst {
    case (HEADER_SALESFORCE_CONTACT_ID, sfContactId) => Right(SalesforceContactId(sfContactId))
    case (HEADER_IDENTITY_ID, identityId) => Left(IdentityId(identityId))
  }).toApiGatewayOp(s"either '$HEADER_IDENTITY_ID' header OR '$HEADER_SALESFORCE_CONTACT_ID' (one is required)")

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

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))

    val extractOptionalSubNameOp: ApiGatewayOp[Option[SubscriptionName]] = req.pathParameters match {
      case Some(_) => req.pathParamsAsCaseClass[GetPathParams]()(Json.reads[GetPathParams]).map(_.subscriptionName)
      case None => ContinueProcessing(None)
    }

    val optionalProductNamePrefix = req.headers.flatMap(_.get(HEADER_PRODUCT_NAME_PREFIX).map(ProductName.apply))

    (for {
      contact <- extractContactFromHeaders(req.headers)
      optionalSubName <- extractOptionalSubNameOp
      usersHolidayStopRequests <- lookupOp(contact, optionalSubName).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
    } yield ApiGatewayResponse(
      "200",
      GetHolidayStopRequests(usersHolidayStopRequests, optionalProductNamePrefix)
    )).apiResponse
  }

  def stepsToCreate(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val verifyContactOwnsSubOp = SalesforceSFSubscription.SubscriptionForSubscriptionNameAndContact(sfClient.wrapWith(JsonHttp.getWithParams))
    val createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequestWithDetail(sfClient.wrapWith(JsonHttp.post))

    (for {
      requestBody <- req.bodyAsCaseClass[HolidayStopRequestPartial]()
      contact <- extractContactFromHeaders(req.headers)
      maybeMatchingSub <- verifyContactOwnsSubOp(requestBody.subscriptionName, contact).toDisjunction.toApiGatewayOp(s"fetching subscriptions for contact $contact")
      matchingSub <- maybeMatchingSub.toApiGatewayOp(s"contact $contact does not own ${requestBody.subscriptionName.value}")
      _ <- createOp(CreateHolidayStopRequestWithDetail.buildBody(requestBody.start, requestBody.end, matchingSub)).toDisjunction.toApiGatewayOp(s"create new Holiday Stop Request for subscription ${requestBody.subscriptionName} (contact $contact)")
      // TODO nice to have - handle 'FIELD_CUSTOM_VALIDATION_EXCEPTION' etc back from SF and place in response
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  case class DeletePathParams(subscriptionName: SubscriptionName, holidayStopRequestId: HolidayStopRequestId)

  def stepsToDelete(req: ApiGatewayRequest, sfClient: SfClient): ApiResponse = {

    val lookupOp = SalesforceHolidayStopRequest.LookupByContactAndOptionalSubscriptionName(sfClient.wrapWith(JsonHttp.getWithParams))
    val deleteOp = SalesforceHolidayStopRequest.DeleteHolidayStopRequest(sfClient.wrapWith(JsonHttp.deleteWithStringResponse))

    (for {
      contact <- extractContactFromHeaders(req.headers)
      pathParams <- req.pathParamsAsCaseClass[DeletePathParams]()(Json.reads[DeletePathParams])
      existingForUser <- lookupOp(contact, None).toDisjunction.toApiGatewayOp(s"lookup Holiday Stop Requests for contact $contact")
      _ = existingForUser.exists(_.Id == pathParams.holidayStopRequestId).toApiGatewayContinueProcessing(ApiGatewayResponse.forbidden("not your holiday stop"))
      _ <- deleteOp(pathParams.holidayStopRequestId).toDisjunction.toApiGatewayOp(s"delete Holiday Stop Request for subscription ${pathParams.subscriptionName.value} of contact $contact")
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  }

  def unsupported(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest("UNSUPPORTED HTTP METHOD")

  def notfound(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.notFound("Not Found")

  def badrequest(message: String)(req: ApiGatewayRequest, sfClient: HttpOp[StringHttpRequest, BodyAsString]): ApiResponse =
    ApiGatewayResponse.badRequest(message)
}