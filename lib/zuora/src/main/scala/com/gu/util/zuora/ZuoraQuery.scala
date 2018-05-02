package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.functional.syntax._
import play.api.libs.json._

object ZuoraQuery {

  case class Query(queryString: String)

  case class QueryLocator(value: String) extends AnyVal

  case class QueryResult[QUERYRECORD](records: List[QUERYRECORD], size: Int, done: Boolean, queryLocator: Option[QueryLocator])

  implicit val queryW: Writes[Query] = Json.writes[Query]

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

  // https://www.zuora.com/developer/api-reference/#operation/Action_POSTquery
  @deprecated("use the partial application version below")
  def getResults[QUERYRECORD: Reads](requests: Requests)(query: Query): ClientFailableOp[QueryResult[QUERYRECORD]] =
    requests.post(query, s"action/query", true): ClientFailableOp[QueryResult[QUERYRECORD]]

  // in order to allow partial application, we need to use a trait
  def apply(requests: Requests): ZuoraQuerier = new ZuoraQuerier {
    def apply[QUERYRECORD: Reads](query: Query): ClientFailableOp[QueryResult[QUERYRECORD]] =
      requests.post(query, s"action/query", true): ClientFailableOp[QueryResult[QUERYRECORD]]
  }

  trait ZuoraQuerier {
    // this is a single function that can be partially applied, but it has to be a trait because type parameters are needed
    // don't add any extra methods to this trait
    def apply[QUERYRECORD: Reads](query: ZuoraQuery.Query): ClientFailableOp[QueryResult[QUERYRECORD]]
  }
}
