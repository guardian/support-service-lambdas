package com.gu.util.zuora

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import scalaz.std.list.listInstance
import scalaz.syntax.traverse.ToTraverseOps
import scalaz.{-\/, \/-}

import scala.annotation.implicitNotFound

object SafeQueryBuilder {

  object Implicits {

    implicit class Query(val sc: StringContext) extends AnyVal {

      // only went up to 4 at the moment, might need more

      def zoql[A: MakeSafe, B: MakeSafe, C: MakeSafe, D: MakeSafe](a: A, b: B, c: C, d: D): ClientFailableOp[SafeQuery] =
        SafeQuery(hardCode = sc, inserts = List(asSafe(a), asSafe(b), asSafe(c), asSafe(d)))

      def zoql[A: MakeSafe, B: MakeSafe, C: MakeSafe](a: A, b: B, c: C): ClientFailableOp[SafeQuery] =
        SafeQuery(hardCode = sc, inserts = List(asSafe(a), asSafe(b), asSafe(c)))

      def zoql[A: MakeSafe, B: MakeSafe](a: A, b: B): ClientFailableOp[SafeQuery] =
        SafeQuery(hardCode = sc, inserts = List(asSafe(a), asSafe(b)))

      def zoql[A: MakeSafe](a: A): ClientFailableOp[SafeQuery] =
        SafeQuery(hardCode = sc, inserts = List(asSafe(a)))

    }

    private def asSafe[A](a: A)(implicit makeSafe: MakeSafe[A]) = makeSafe(a)

    @implicitNotFound("implicitNotFound: SafeQueryBuilder: can only insert a string literal or an already safe query into a parent query")
    trait MakeSafe[A] {
      def apply(a: A): ClientFailableOp[String]
    }

    implicit val makeSafeAlreadySafe: MakeSafe[SafeQuery] = new MakeSafe[SafeQuery] {
      override def apply(safeQuery: SafeQuery): ClientFailableOp[String] =
        \/-(safeQuery.queryString)
    }

    // this code is designed for the zoql query interface, where backslash is used to escape any special characters
    // https://knowledgecenter.zuora.com/DC_Developers/K_Zuora_Object_Query_Language/Filter_Statements#Reserved_and_Escaped_Characters
    // However, in the "zoql export" api, which takes pretty much the same types of queries, in typical zuora style they
    // have gone for escaping single quotes by doubling them up. So we will need a separate serialiser for that at some point
    // https://knowledgecenter.zuora.com/DC_Developers/M_Export_ZOQL/A_Select_Statement#Reserved_and_Escaped_Characters
    //
    // this has been tested and confirmed in june 2018
    implicit val makeSafeStringIntoQueryLiteral: MakeSafe[String] = new MakeSafe[String] {
      override def apply(untrusted: String): ClientFailableOp[String] = {
        if (untrusted.replaceFirst("""\p{Cntrl}""", "") != untrusted) {
          -\/(GenericError(s"control characters can't be inserted into a query: $untrusted"))
        } else {
          val trusted = untrusted.replaceAll("""\\""", """\\\\""")
            .replaceAll("'", """\\'""")
            .replaceAll(""""""", """\\"""")
          \/-(s"'$trusted'")
        }

      }
    }

  }

  object ToNel {
    def apply[A](list: List[A]): Option[::[A]] =
      list match {
        case Nil => None
        case account :: accounts =>
          Some(::(account, accounts))
      }
    def literal[A](first: A, rest: A*): ::[A] =
      ::(first, List(rest: _*))
  }

  object OrTraverse {
    def apply[A](queries: ::[A])(f: A => ClientFailableOp[SafeQuery]): ClientFailableOp[SafeQuery] = {
      queries.toList.traverseU(f.andThen(_.map(_.queryString))).map(_.mkString(" or ")).map(new SafeQuery(_))
    }
  }

  object SafeQuery {

    def apply(hardCode: StringContext, inserts: List[ClientFailableOp[String]]): ClientFailableOp[SafeQuery] = {
      val maybeEscapedInserts = inserts.sequence
      maybeEscapedInserts.map { escapedInserts =>
        val rawQueryString = hardCode.s(escapedInserts.toArray: _*)
        val queryString = rawQueryString.lines.map(_.trim).filter(_ != "").mkString(" ")
        new SafeQuery(queryString)
      }
    }

  }

  // to make one of these just
  //import com.gu.util.zuora.SafeQueryBuilder.Implicits._
  // and do
  // zoql"SELECT Id FROM Account where IdentityId__c=${identityId.value}"
  class SafeQuery(val queryString: String)

}
