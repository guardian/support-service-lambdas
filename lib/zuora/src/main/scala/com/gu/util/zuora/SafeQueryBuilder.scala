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

    implicit val makeSafeStringIntoQueryLiteral: MakeSafe[String] = new MakeSafe[String] {
      override def apply(untrusted: String): ClientFailableOp[String] = {
        if (untrusted.replaceAll("""\p{Cntrl}""", "") != untrusted) {
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

  object OrTraverse {
    def apply[A](queries: List[A])(f: A => ClientFailableOp[SafeQuery]): ClientFailableOp[SafeQuery] = {
      queries.traverseU(f.andThen(_.map(_.queryString))).map(_.mkString(" or ")).map(new SafeQuery(_))
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

  class SafeQuery(val queryString: String)

}
