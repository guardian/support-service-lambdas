package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.functional.syntax._
import play.api.libs.json._

object ZuoraQuery {

  implicit class Query(val sc: StringContext) extends AnyVal {
    def zoql(args: Any*): SanitisedQuery = {
      SanitisedQuery(hardCode = sc, inserts = args)
    }
  }

  object Or {
    def apply(queries: List[SanitisedQuery]): SanitisedQuery = {
      new SanitisedQuery(queries.map(_.queryString).mkString(" or "))
    }
  }

  object SanitisedQuery {

    def sanitise(input: String): String = {
      val sanitised = input
        .replaceAll("""\p{Cntrl}""", "")
        .replaceAll("""\\""", """\\\\""")
        .replaceAll("'", """\\'""")
        .replaceAll(""""""", """\\"""")
      s"'$sanitised'"
    }

    def doInsert(input: Any): String = input match {
      case SanitisedQuery(string) => string // already sanitised
      case untrusted => sanitise(untrusted.toString)
    }

    def apply(hardCode: StringContext, inserts: Seq[Any]): SanitisedQuery = {
      val queryString = hardCode.s(inserts.map(doInsert).toArray: _*)
      new SanitisedQuery(queryString)
    }

    def unapply(arg: SanitisedQuery): Option[String] = Some(arg.queryString)
  }

  class SanitisedQuery(val queryString: String) {
    def stripMarginAndNewline: SanitisedQuery = new SanitisedQuery(queryString.stripMargin.replaceAll("\n", ""))
  }

  case class QueryLocator(value: String) extends AnyVal

  case class QueryResult[QUERYRECORD](records: List[QUERYRECORD], size: Int, done: Boolean, queryLocator: Option[QueryLocator])

  // can't generate from macro as it needs an apply method for some reason which we'd rather not expose
  implicit val queryW: Writes[SanitisedQuery] = (JsPath \ "queryString").write[String].contramap(_.queryString)

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
    def apply[QUERYRECORD: Reads](query: SanitisedQuery): ClientFailableOp[QueryResult[QUERYRECORD]] =
      requests.post(query, s"action/query", true): ClientFailableOp[QueryResult[QUERYRECORD]]
  }

  trait ZuoraQuerier {
    // this is a single function that can be partially applied, but it has to be a trait because type parameters are needed
    // don't add any extra methods to this trait
    def apply[QUERYRECORD: Reads](query: ZuoraQuery.SanitisedQuery): ClientFailableOp[QueryResult[QUERYRECORD]]
  }
}
