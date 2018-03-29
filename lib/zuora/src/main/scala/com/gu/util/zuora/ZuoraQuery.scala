package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.internal.Types.{WithDepsClientFailableOp, _}
import play.api.libs.functional.syntax._
import play.api.libs.json._
import scalaz.Reader

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
  def getResults[QUERYRECORD: Reads](query: Query): WithDepsClientFailableOp[ZuoraDeps, QueryResult[QUERYRECORD]] =
    Reader { zuoraDeps: ZuoraDeps => ZuoraRestRequestMaker(zuoraDeps).post(query, s"action/query", true): ClientFailableOp[QueryResult[QUERYRECORD]] }.toEitherT

}
