package com.gu.salesforce

import com.gu.salesforce.SalesforceClient._
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsValue, Json}

import scala.util.Try

object JsonHttp {

  val patch =
    HttpOpWrapper[PatchRequest, StringHttpRequest, BodyAsString, Unit](
      (patchRequest: PatchRequest) =>
        StringHttpRequest(PatchMethod(BodyAsString(Json.stringify(patchRequest.body))), patchRequest.path, UrlParams.empty),

      (response: BodyAsString) => ClientSuccess(())
    )

  val post =
    HttpOpWrapper[PostRequest, StringHttpRequest, BodyAsString, JsValue](
      (postRequest: PostRequest) =>
        StringHttpRequest(PostMethod(BodyAsString(Json.stringify(postRequest.body))), postRequest.path, UrlParams.empty),

      deserialiseJsonResponse
    )

  def get = {
    HttpOpWrapper[GetRequest, StringHttpRequest, BodyAsString, JsValue](
      (getRequest: GetRequest) =>
        StringHttpRequest(GetMethod, getRequest.path, UrlParams.empty),

      deserialiseJsonResponse
    )
  }

  def getWithParams = {
    HttpOpWrapper[GetRequestWithParams, StringHttpRequest, BodyAsString, JsValue](
      (getRequest: GetRequestWithParams) =>
        StringHttpRequest(GetMethod, getRequest.path, getRequest.urlParams),

      deserialiseJsonResponse
    )
  }

  def deserialiseJsonResponse(response: BodyAsString): ClientFailableOp[JsValue] =
    Try(Json.parse(response.value)) match {
      case scala.util.Success(value) => ClientSuccess(value)
      case scala.util.Failure(exception) => GenericError(s"could not deserialise json $response: $exception")
    }
}
