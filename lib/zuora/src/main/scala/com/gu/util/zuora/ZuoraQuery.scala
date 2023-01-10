package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.{Requests, WithoutCheck}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.SafeQuery
import play.api.libs.functional.syntax._
import play.api.libs.json._

object ZuoraQuery {

  case class QueryLocator(value: String) extends AnyVal

  case class QueryResult[QUERYRECORD](
      records: List[QUERYRECORD],
      size: Int,
      done: Boolean,
      queryLocator: Option[QueryLocator],
  )

  // can't generate from macro as it needs an apply method for some reason which we'd rather not expose
  implicit val queryW: Writes[SafeQuery] =
    (response: SafeQuery) =>
      Json.obj(
        "queryString" -> response.queryString,
      )

  implicit val queryLocator: Format[QueryLocator] =
    Format[QueryLocator](JsPath.read[String].map(QueryLocator.apply), Writes { (o: QueryLocator) => JsString(o.value) })

  implicit def queryResultR[QUERYRECORD: Reads]: Reads[QueryResult[QUERYRECORD]] = (
    (JsPath \ "records").read[List[QUERYRECORD]] and
      (JsPath \ "size").read[Int] and
      (JsPath \ "done").read[Boolean] and
      (JsPath \ "queryLocator").readNullable[QueryLocator]
  ).apply(QueryResult.apply[QUERYRECORD] _)

  case class QueryMoreReq(queryLocator: QueryLocator)

  implicit val wQueryMoreReq: Writes[QueryMoreReq] = Json.writes[QueryMoreReq]

  // in order to allow partial application with unapplied type parameter, we need to use a trait
  def apply(requests: Requests): ZuoraQuerier = new ZuoraQuerier {
    def apply[QUERYRECORD: Reads](query: SafeQuery): ClientFailableOp[QueryResult[QUERYRECORD]] =
      requests.post[SafeQuery, QueryResult[QUERYRECORD]](query, s"action/query", WithoutCheck)
  }

  trait ZuoraQuerier {
    // this is a single function that can be partially applied, but it has to be a trait because type parameters are needed
    // don't add any extra methods to this trait
    def apply[QUERYRECORD: Reads](query: SafeQuery): ClientFailableOp[QueryResult[QUERYRECORD]]
  }
}
