package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFail, ClientFailableOp, GenericError, Requests}
import play.api.libs.functional.syntax._
import play.api.libs.json._
import scalaz.std.list.listInstance
import scalaz.syntax.traverse.ToTraverseOps
import scalaz.{-\/, \/, \/-}

import scala.annotation.implicitNotFound

object ZuoraQuery {

  implicit class Query(val sc: StringContext) extends AnyVal {

    def zoql[A: Conv, B: Conv, C: Conv, D: Conv](a: A, b: B, c: C, d: D): ClientFailableOp[SanitisedQuery] =
      SanitisedQuery(hardCode = sc, inserts = List(conv(a), conv(b), conv(c), conv(d)))

    def zoql[A: Conv, B: Conv, C: Conv](a: A, b: B, c: C): ClientFailableOp[SanitisedQuery] =
      SanitisedQuery(hardCode = sc, inserts = List(conv(a), conv(b), conv(c)))

    def zoql[A: Conv, B: Conv](a: A, b: B): ClientFailableOp[SanitisedQuery] =
      SanitisedQuery(hardCode = sc, inserts = List(conv(a), conv(b)))

    def zoql[A: Conv](a: A): ClientFailableOp[SanitisedQuery] =
      SanitisedQuery(hardCode = sc, inserts = List(conv(a)))

  }

  def conv[A](a: A)(implicit aString: Conv[A]) = aString(a)

  @implicitNotFound("implicitNotFound: ZuoraQuery: can only insert a string literal or a sanitised query into a parent query")
  trait Conv[A] {
    def apply(a: A): ClientFailableOp[String]
  }

  implicit val aaa = new Conv[SanitisedQuery] {
    override def apply(a: SanitisedQuery): ClientFailableOp[String] = \/-(a.queryString) // already sanitised
  }

  implicit val aaac = new Conv[ClientFail \/ SanitisedQuery] {
    override def apply(a: ClientFail \/ SanitisedQuery): ClientFailableOp[String] = a match {
      case \/-(SanitisedQuery(string)) => \/-(string) // already sanitised
      case -\/(fail: ClientFail) => -\/(fail) // failed to sanitise the sub query
    }
  }

  implicit val stringInsertToQueryLiteral = new Conv[String] {
    override def apply(untrusted: String): ClientFailableOp[String] = {
      val sanitised = \/-(untrusted)
        .flatMap { orig =>
          if (orig.replaceAll("""\p{Cntrl}""", "") == orig)
            \/-(orig)
          else
            -\/(GenericError(s"control characters can't be inserted into a query: $orig"))
        }
        .map(_.replaceAll("""\\""", """\\\\""")
          .replaceAll("'", """\\'""")
          .replaceAll(""""""", """\\""""))
      sanitised.map(sanitised => s"'$sanitised'")
    }
  }

  object OrTraverse {
    def apply[A](queries: List[A])(f: A => ClientFailableOp[SanitisedQuery]): ClientFailableOp[SanitisedQuery] = {
      queries.traverseU(f.andThen(_.map(_.queryString))).map(_.mkString(" or ")).map(new SanitisedQuery(_))
    }
  }

  object SanitisedQuery {

    def apply(hardCode: StringContext, inserts: List[ClientFailableOp[String]]): ClientFailableOp[SanitisedQuery] = {
      val maybeEscapedInserts = inserts.sequence
      maybeEscapedInserts.map { escapedInserts =>
        val rawQueryString = hardCode.s(escapedInserts.toArray: _*)
        val queryString = rawQueryString.lines.map(_.trim).filter(_ != "").mkString(" ")
        new SanitisedQuery(queryString)
      }
    }

    def unapply(arg: SanitisedQuery): Option[String] = Some(arg.queryString)
  }

  class SanitisedQuery(val queryString: String)

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
