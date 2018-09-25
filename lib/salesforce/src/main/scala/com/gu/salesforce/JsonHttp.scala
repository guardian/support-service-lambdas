package com.gu.salesforce

import com.gu.salesforce.SalesforceClient.{GetMethod, StringHttpRequest, PatchMethod, PostMethod}
import com.gu.util.resthttp.HttpOp.HttpWrapper
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsValue, Json}

import scala.util.Try

object JsonHttp {

  val patch =
    new HttpWrapper[PatchRequest, StringHttpRequest, BodyAsString, Unit] {
      override def fromNewParam(patchRequest: PatchRequest): StringHttpRequest =
        StringHttpRequest(patchRequest.path, PatchMethod(BodyAsString(Json.stringify(patchRequest.body))))

      override def toNewResponse(response: BodyAsString): ClientFailableOp[Unit] = ClientSuccess(())
    }

  val post =
    new HttpWrapper[PostRequest, StringHttpRequest, BodyAsString, JsValue] {
      override def fromNewParam(postRequest: PostRequest): StringHttpRequest =
        StringHttpRequest(postRequest.path, PostMethod(BodyAsString(Json.stringify(postRequest.body))))

      override def toNewResponse(response: BodyAsString): ClientFailableOp[JsValue] =
        Try(Json.parse(response.value)) match {
          case scala.util.Success(value) => ClientSuccess(value)
          case scala.util.Failure(exception) => GenericError(s"could not deserialise json $response: $exception")
        }
    }

  def get =
    new HttpWrapper[GetRequest, StringHttpRequest, BodyAsString, JsValue] {
      override def fromNewParam(getRequest: GetRequest): StringHttpRequest =
        StringHttpRequest(getRequest.path, GetMethod)

      override def toNewResponse(response: BodyAsString): ClientFailableOp[JsValue] =
        Try(Json.parse(response.value)) match {
          case scala.util.Success(value) => ClientSuccess(value)
          case scala.util.Failure(exception) => GenericError(s"could not deserialise json $response: $exception")
        }
    }

}
