package com.gu.salesforce

import com.gu.util.resthttp.HttpOp.HttpWrapper
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsValue, Json}

import scala.util.Try

object JsonHttp {

  sealed trait RequestMethod
  case class PostMethod(body: BodyAsString) extends RequestMethod
  case class PatchMethod(body: BodyAsString) extends RequestMethod
  case object GetMethod extends RequestMethod

  case class HttpRequestInfo(relativePath: RelativePath, requestMethod: RequestMethod)

  val patch =
    new HttpWrapper[PatchRequest, HttpRequestInfo, BodyAsString, Unit] {
      override def fromNewParam(patchRequest: PatchRequest): HttpRequestInfo =
        HttpRequestInfo(patchRequest.path, PatchMethod(BodyAsString(Json.stringify(patchRequest.body))))

      override def toNewResponse(response: BodyAsString): ClientFailableOp[Unit] = ClientSuccess(())
    }

  val post =
    new HttpWrapper[PostRequest, HttpRequestInfo, BodyAsString, JsValue] {
      override def fromNewParam(postRequest: PostRequest): HttpRequestInfo =
        HttpRequestInfo(postRequest.path, PostMethod(BodyAsString(Json.stringify(postRequest.body))))

      override def toNewResponse(response: BodyAsString): ClientFailableOp[JsValue] =
        Try(Json.parse(response.value)) match {
          case scala.util.Success(value) => ClientSuccess(value)
          case scala.util.Failure(exception) => GenericError(s"could not deserialise json $response: $exception")
        }
    }

  def get =
    new HttpWrapper[GetRequest, HttpRequestInfo, BodyAsString, JsValue] {
      override def fromNewParam(getRequest: GetRequest): HttpRequestInfo =
        HttpRequestInfo(getRequest.path, GetMethod)

      override def toNewResponse(response: BodyAsString): ClientFailableOp[JsValue] =
        Try(Json.parse(response.value)) match {
          case scala.util.Success(value) => ClientSuccess(value)
          case scala.util.Failure(exception) => GenericError(s"could not deserialise json $response: $exception")
        }
    }

}
