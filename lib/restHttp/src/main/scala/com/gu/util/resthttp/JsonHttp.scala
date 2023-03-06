package com.gu.util.resthttp

import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import okhttp3.Request
import play.api.libs.json.{JsValue, Json}

import scala.util.Try

object JsonHttp {

  sealed trait RequestMethod {
    def builder: Request.Builder
  }
  case class PostMethod(body: BodyAsString, contentType: ContentType = JsonContentType) extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().post(createBodyFromString(body, contentType))
  }
  case class PatchMethod(body: BodyAsString) extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().patch(createBodyFromString(body))
  }
  case object GetMethod extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().get()
  }
  case object DeleteMethod extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().delete()
  }

  case class StringHttpRequest(
      requestMethod: RequestMethod,
      relativePath: RelativePath,
      urlParams: UrlParams,
      headers: List[Header] = List.empty,
  )

  val patch =
    HttpOpWrapper[PatchRequest, StringHttpRequest, BodyAsString, Unit](
      (patchRequest: PatchRequest) =>
        StringHttpRequest(
          PatchMethod(BodyAsString(Json.stringify(patchRequest.body))),
          patchRequest.path,
          UrlParams.empty,
        ),
      _ => ClientSuccess(()),
    )

  val post =
    HttpOpWrapper[PostRequest, StringHttpRequest, BodyAsString, JsValue](
      (postRequest: PostRequest) =>
        StringHttpRequest(
          PostMethod(BodyAsString(Json.stringify(postRequest.body))),
          postRequest.path,
          UrlParams.empty,
        ),
      deserialiseJsonResponse,
    )

  val postWithHeaders =
    HttpOpWrapper[PostRequestWithHeaders, StringHttpRequest, BodyAsString, JsValue](
      (postRequest: PostRequestWithHeaders) =>
        StringHttpRequest(
          PostMethod(BodyAsString(Json.stringify(postRequest.body))),
          postRequest.path,
          UrlParams.empty,
          postRequest.headers,
        ),
      deserialiseJsonResponse,
    )

  def get = {
    HttpOpWrapper[GetRequest, StringHttpRequest, BodyAsString, JsValue](
      (getRequest: GetRequest) => StringHttpRequest(GetMethod, getRequest.path, UrlParams.empty),
      deserialiseJsonResponse,
    )
  }

  def getWithParams = {
    HttpOpWrapper[GetRequestWithParams, StringHttpRequest, BodyAsString, JsValue](
      (getRequest: GetRequestWithParams) => StringHttpRequest(GetMethod, getRequest.path, getRequest.urlParams),
      deserialiseJsonResponse,
    )
  }

  val delete = {
    HttpOpWrapper[DeleteRequest, StringHttpRequest, BodyAsString, JsValue](
      (deleteRequest: DeleteRequest) => StringHttpRequest(DeleteMethod, deleteRequest.path, UrlParams.empty),
      deserialiseJsonResponse,
    )
  }

  val deleteWithStringResponse = {
    HttpOpWrapper[DeleteRequest, StringHttpRequest, BodyAsString, String](
      (deleteRequest: DeleteRequest) => StringHttpRequest(DeleteMethod, deleteRequest.path, UrlParams.empty),
      (response: BodyAsString) => ClientSuccess(response.value),
    )
  }

  def deserialiseJsonResponse(response: BodyAsString): ClientFailableOp[JsValue] =
    Try(Json.parse(response.value)) match {
      case scala.util.Success(value) => ClientSuccess(value)
      case scala.util.Failure(exception) => GenericError(s"could not deserialise json $response: $exception")
    }

}
